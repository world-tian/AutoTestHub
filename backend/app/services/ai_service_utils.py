import json
import re
from typing import Dict, Any

def extract_json_from_llm_response(content: str) -> Dict[str, Any]:
    """安全提取LLM返回的JSON"""
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # 尝试使用正则提取
        json_pattern = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
        if json_pattern:
            try:
                return json.loads(json_pattern.group(1))
            except:
                pass
        
        # 尝试寻找最外层的 {}
        bracket_pattern = re.search(r'(\{.*\})', content, re.DOTALL)
        if bracket_pattern:
            try:
                return json.loads(bracket_pattern.group(1))
            except:
                pass
                
        return {"cases": []}
