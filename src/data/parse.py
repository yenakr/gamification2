import re
import json

def parse_quiz_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Normalize newlines
    content = content.replace('\r\n', '\n')
    
    # Split into categories by ## at the start of a line
    category_splits = re.split(r'\n##\s+', '\n' + content)
    
    categories = []
    
    meta_mapping = {
        '이승돌봄': ('transfer', '♿', '침대에서 휠체어로, 혹은 휠체어에서 변기로 대상자를 안전하게 들어올려 이동을 돕습니다.'),
        '배설돌봄': ('excretion', '🚽', '배설 감지 및 자동 세정/건조를 통해 대상자의 위생과 자존감을 지켜줍니다.'),
        '식사돌봄': ('meal', '🍱', '식사 시 숟가락과 젓가락질을 보조하거나, 로봇 팔로 음식을 떠서 입 앞까지 배달해줍니다.'),
        '자세변경': ('posture', '🛌', '침대에 누워 있는 대상자의 자세를 주기적으로 바꾸어 욕창을 예방합니다.'),
        '커뮤니케이션': ('communication', '🤖', '말벗 기능, 인지 재활 게임, 복약 시간 알림을 통해 정서적 교감과 일상 관리를 수행합니다.')
    }
    
    for cat_sec in category_splits:
        lines = cat_sec.split('\n')
        if not lines:
            continue
        header = lines[0].strip()
        
        # Match category name
        matched_key = None
        for key in meta_mapping:
            if key in header:
                matched_key = key
                break
        
        if not matched_key:
            continue
            
        cat_id, cat_icon, cat_desc = meta_mapping[matched_key]
        
        # Find parts inside this category using finditer
        parts_matches = list(re.finditer(r'###\s+Part\s+([ⅠⅡⅢⅣⅤⅥⅦ]+)\.\s*(.*?)\n', cat_sec))
        
        parts = []
        part_num = 1
        
        for idx, match in enumerate(parts_matches):
            roman = match.group(1).strip()
            part_title_raw = match.group(2).strip()
            
            # Clean part title
            part_title = part_title_raw.split('(')[0].strip()
            
            # Determine start and end of this part's body
            start = match.end()
            end = parts_matches[idx+1].start() if idx+1 < len(parts_matches) else len(cat_sec)
            part_body = cat_sec[start:end]
            
            # Extract Pre-Quiz
            pre_quiz = []
            pre_match = re.search(r'\[사전퀴즈\](.*?)(?=\[평가하기\]|#### 평가퀴즈|###|$)', part_body, re.DOTALL)
            if pre_match:
                pre_quiz = parse_pre_quiz(pre_match.group(1))
                
            # Extract Post-Quiz
            post_quiz = []
            post_match = re.search(r'\[평가하기\](.*)', part_body, re.DOTALL)
            if post_match:
                post_quiz = parse_post_quiz(post_match.group(1))
                
            # Fallback if no questions parsed to avoid empty quizzes
            if not pre_quiz and not post_quiz:
                continue
                
            study_slides = generate_study_slides(matched_key, part_title, pre_quiz, post_quiz)
            
            parts.append({
                'id': part_num,
                'title': part_title,
                'studySlides': study_slides,
                'preQuiz': pre_quiz,
                'postQuiz': post_quiz
            })
            part_num += 1
            
        categories.append({
            'id': cat_id,
            'name': matched_key + '로봇',
            'icon': cat_icon,
            'description': cat_desc,
            'parts': parts
        })
        
    return categories

def parse_pre_quiz(text):
    text = text.replace('```', '').strip()
    parts = text.split('§')
    if len(parts) < 2:
        # Fallback if § separator is missing
        if '[사전퀴즈]' in text:
            subparts = text.split('[사전퀴즈]')
            if len(subparts) >= 3:
                q_part = subparts[1]
                a_part = subparts[2]
                parts = [q_part, a_part]
            else:
                return []
        elif '정답 및 해설' in text:
            parts = text.split('정답 및 해설')
        else:
            return []
    
    q_part, a_part = parts[0], parts[1]
    
    # Parse questions
    q_lines = q_part.strip().split('\n')
    questions_list = []
    current_q = None
    for line in q_lines:
        line = line.strip()
        if not line or '사전퀴즈' in line:
            continue
        m = re.match(r'^(\d+)\.\s*(.*)', line)
        if m:
            if current_q:
                questions_list.append(current_q)
            current_q = {'num': m.group(1), 'text': m.group(2)}
        else:
            if current_q:
                current_q['text'] += ' ' + line
    if current_q:
        questions_list.append(current_q)
        
    # Parse answers
    ans_blocks = re.split(r'\n(?=\d+\.\s*)', '\n' + a_part)
    answers = {}
    for block in ans_blocks:
        block = block.strip()
        if not block:
            continue
        num_m = re.match(r'^(\d+)\.', block)
        if not num_m:
            continue
        num = num_m.group(1)
        ans_m = re.search(r'정답:\s*([OX])', block)
        exp_m = re.search(r'해설:\s*(.*)', block, re.DOTALL)
        
        ans_val = ans_m.group(1) if ans_m else 'O'
        exp_val = exp_m.group(1).strip() if exp_m else ''
        answers[num] = (ans_val, exp_val)
        
    final_questions = []
    for q in questions_list:
        num = q['num']
        text_content = q['text'].strip()
        ans_val, exp_val = answers.get(num, ('O', ''))
        
        final_questions.append({
            'id': f"pre-{num}-{hash(text_content) % 10000}",
            'question': text_content,
            'options': ['O', 'X'],
            'answerIndex': 0 if ans_val == 'O' else 1,
            'explanation': exp_val
        })
    return final_questions

def parse_post_quiz(text):
    text = text.replace('```', '').strip()
    if 'A set' in text:
        a_set_match = re.search(r'A\s*set(.*?)((?=B\s*set)|$)', text, re.DOTALL)
        if a_set_match:
            text = a_set_match.group(1)
            
    parts = text.split('§')
    if len(parts) < 2:
        return []
        
    q_part, a_part = parts[0], parts[1]
    
    # Parse questions
    q_blocks = re.split(r'(?=문제\d+)', q_part)
    questions = []
    for block in q_blocks:
        block = block.strip()
        if not block:
            continue
        lines = block.split('\n')
        num_m = re.match(r'^문제(\d+)', lines[0])
        if not num_m:
            continue
        num = num_m.group(1)
        
        q_text = ""
        options = []
        is_options = False
        
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue
            if line == '보기':
                is_options = True
                continue
            if is_options:
                opt_m = re.match(r'^(\d+)\)\s*(.*)', line)
                if opt_m:
                    options.append(opt_m.group(2).strip())
                else:
                    if options:
                        options[-1] += ' ' + line
            else:
                if not line.startswith('(난이도:'):
                    q_text += (' ' if q_text else '') + line
                    
        questions.append({
            'num': num,
            'question': q_text,
            'options': options
        })
        
    # Parse answers
    ans_blocks = re.split(r'(?=문제\d+)', a_part)
    answers = {}
    for block in ans_blocks:
        block = block.strip()
        if not block:
            continue
        lines = block.split('\n')
        num_m = re.match(r'^문제(\d+)', lines[0])
        if not num_m:
            continue
        num = num_m.group(1)
        
        block_content = '\n'.join(lines[1:])
        ans_m = re.search(r'정답:\s*(\d+)', block_content)
        exp_m = re.search(r'해설:\s*(.*)', block_content, re.DOTALL)
        
        ans_val = int(ans_m.group(1)) - 1 if ans_m else 0
        exp_val = exp_m.group(1).strip() if exp_m else ''
        answers[num] = (ans_val, exp_val)
        
    final_questions = []
    for q in questions:
        num = q['num']
        ans_val, exp_val = answers.get(num, (0, ''))
        
        final_questions.append({
            'id': f"post-{num}-{hash(q['question']) % 10000}",
            'question': q['question'],
            'options': q['options'],
            'answerIndex': ans_val,
            'explanation': exp_val
        })
    return final_questions

def generate_study_slides(category, part_title, pre_quiz, post_quiz):
    slides = []
    slides.append(f"이번 파트에서는 {category}의 '{part_title}'에 대해 학습합니다. 먼저 기본 개념을 정리해 보겠습니다.")
    
    for q in pre_quiz:
        slides.append(f"💡 사전 점검 포인트:\n{q['question']}\n➡️ {q['explanation']}")
    for q in post_quiz[:2]:
        slides.append(f"📌 주요 요점 정리:\n{q['question']}\n➡️ {q['explanation']}")
        
    slides.append("개념 정리가 완료되었습니다. 준비가 되었다면 아래 '최종 테스트 도전!' 버튼을 눌러 평가 퀴즈를 풀어보세요!")
    return slides

if __name__ == '__main__':
    parsed = parse_quiz_file('/Users/yena/Desktop/gamification/src/data/raw_quiz.txt')
    
    ts_content = f"// This file is auto-generated from raw_quiz.txt\n\n"
    ts_content += "export interface Question {\n  id: string;\n  question: string;\n  options: string[];\n  answerIndex: number;\n  explanation: string;\n}\n\n"
    ts_content += "export interface PartData {\n  id: number;\n  title: string;\n  studySlides: string[];\n  preQuiz: Question[];\n  postQuiz: Question[];\n}\n\n"
    ts_content += "export interface RobotCategory {\n  id: string;\n  name: string;\n  icon: string;\n  description: string;\n  parts: PartData[];\n}\n\n"
    ts_content += "export const quizData: RobotCategory[] = " + json.dumps(parsed, ensure_ascii=False, indent=2) + ";\n"
    
    with open('/Users/yena/Desktop/gamification/src/data/quizData.ts', 'w', encoding='utf-8') as f:
        f.write(ts_content)
    print("Successfully generated quizData.ts!")
