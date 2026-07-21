import os, re, html

ROOT = r'C:\Users\amans\Videos\pcids'
DIRS = [ROOT, os.path.join(ROOT, 'admin'), os.path.join(ROOT, 'components'), os.path.join(ROOT, 'blog')]

def find_inner_html_comments(text):
    """Find HTML comments that appear inside <script>...</script> blocks."""
    results = []
    script_pattern = re.compile(r'<script[^>]*>(.*?)</script>', re.DOTALL | re.IGNORECASE)
    comment_pattern = re.compile(r'<!--(.*?)-->', re.DOTALL)
    
    for m in re.finditer(script_pattern, text):
        script_content = m.group(1)
        start = m.start(1)
        for cm in re.finditer(comment_pattern, script_content):
            results.append({
                'start': start + cm.start(),
                'end': start + cm.end(),
                'content': cm.group(1),
                'full_match': cm.group(0)
            })
    return results

def replace_comment(text, c):
    """Replace HTML comment inside script with JS comment."""
    content = c['content']
    lines = content.split('\n')
    if len(lines) <= 1:
        replacement = '//' + content
    else:
        replacement = '/*' + content + '*/'
    return text[:c['start']] + replacement + text[c['end']:]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    
    comments = find_inner_html_comments(text)
    if not comments:
        return False
    
    modified = text
    for c in sorted(comments, key=lambda x: -x['start']):
        modified = replace_comment(modified, c)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(modified)
    
    return True

def main():
    modified_files = []
    for d in DIRS:
        if not os.path.isdir(d):
            continue
        for fname in sorted(os.listdir(d)):
            if not fname.endswith('.html'):
                continue
            fpath = os.path.join(d, fname)
            if process_file(fpath):
                modified_files.append(fpath)
                print(f"MODIFIED: {fpath}")
    
    print(f"\nTotal files modified: {len(modified_files)}")
    for f in modified_files:
        print(f)

if __name__ == '__main__':
    main()
