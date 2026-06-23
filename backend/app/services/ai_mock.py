import json

def generate_mock_test_cases(requirement_text: str):
    # This acts as our AI provider
    return {
        "cases": [
            {
                "title": "验证基本功能流程 (自动生成)",
                "case_category": "manual",
                "priority": "P0",
                "steps": ["启动应用", "输入数据", "验证输出"],
                "expected_result": "系统正常响应，无报错"
            },
            {
                "title": "验证边界异常处理 (自动生成)",
                "case_category": "automated",
                "priority": "P1",
                "steps": ["输入越界参数", "提交表单"],
                "expected_result": "系统拦截并提示非法输入"
            }
        ]
    }
