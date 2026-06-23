import re

with open("app/services/ai_service.py", "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
content = content.replace("import json", "import json\nfrom app.services.ai_service_utils import extract_json_from_llm_response\nimport re")

# Replace all JSON parsing with robust one
import ast

def replace_try_except(match):
    return "return extract_json_from_llm_response(content)"

# Replace block like:
#        try:
#            return json.loads(content)
#        except:
#            return { ... }
pattern = re.compile(r'try:\s+return json\.loads\(content\)\s+except:.*?return \{\s+"cases": \[.*?\}\s+\]\s+\}', re.DOTALL)
content = pattern.sub('return extract_json_from_llm_response(content)', content)

# Also replace the prompt to be more strict
old_prompt = """你是一个专业的测试用例生成专家。根据需求描述，生成结构化的测试用例。
请以JSON格式返回，格式如下："""

new_prompt = """你是一个专业的测试用例生成专家。根据需求描述，生成严格且合法的JSON格式的测试用例。
必须确保输出的是纯JSON数据，不能包含任何markdown格式(如```json)，不能包含其他说明文字。
JSON结构如下："""

content = content.replace(old_prompt, new_prompt)

with open("app/services/ai_service.py", "w", encoding="utf-8") as f:
    f.write(content)
