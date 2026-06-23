import re

with open("app/services/ai_service.py", "r", encoding="utf-8") as f:
    content = f.read()

new_prompt = """你是一个专业的测试用例生成专家。根据需求描述，生成严格且合法的JSON格式的测试用例。
必须确保输出的是纯JSON数据，不能包含任何markdown格式(如```json)，不能包含其他说明文字。
JSON结构如下：
{
    "cases": [
        {
            "title": "用例标题",
            "feature": "功能模块名称(如: 登录、支付等，根据语义归纳)",
            "case_category": "manual|automated",
            "priority": "P0|P1|P2|P3",
            "steps": ["步骤1", "步骤2"],
            "expected_result": "预期结果"
        }
    ]
}"""

# The previous script replaced the old prompt with a partial new_prompt. 
# We need to replace it again with the complete structure.
pattern = re.compile(r'你是一个专业的测试用例生成专家.*?JSON结构如下：(?:.*?\{.*?\})?', re.DOTALL)
content = pattern.sub(new_prompt, content)

with open("app/services/ai_service.py", "w", encoding="utf-8") as f:
    f.write(content)
