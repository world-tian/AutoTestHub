from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import json
from app.services.ai_service_utils import extract_json_from_llm_response
import re
import httpx
from app.core.config import settings


class AIProvider(ABC):
    """AI服务提供商抽象基类"""
    
    @abstractmethod
    async def generate_test_cases(self, requirement_text: str) -> Dict[str, Any]:
        """生成测试用例"""
        pass
    
    @abstractmethod
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        """AI对话"""
        pass
    
    @abstractmethod
    async def analyze_report(self, report_data: Dict[str, Any]) -> str:
        """分析测试报告"""
        pass


class MockProvider(AIProvider):
    """Mock服务提供商（用于开发测试）"""
    
    async def generate_test_cases(self, requirement_text: str) -> Dict[str, Any]:
        return {
            "cases": [
                {
                    "title": "验证基本功能流程 (AI生成)",
                    "case_category": "manual",
                    "priority": "P0",
                    "steps": ["启动应用", "输入数据", "验证输出"],
                    "expected_result": "系统正常响应，无报错"
                },
                {
                    "title": "验证边界异常处理 (AI生成)",
                    "case_category": "automated",
                    "priority": "P1",
                    "steps": ["输入越界参数", "提交表单"],
                    "expected_result": "系统拦截并提示非法输入"
                },
                {
                    "title": "验证性能要求 (AI生成)",
                    "case_category": "manual",
                    "priority": "P2",
                    "steps": ["模拟高并发请求", "监控响应时间"],
                    "expected_result": "响应时间在合理范围内"
                }
            ]
        }
    
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        return "您好！我是AutoTestHub的AI助手。我可以帮助您生成测试用例、分析测试报告，或回答测试相关的问题。"
    
    async def analyze_report(self, report_data: Dict[str, Any]) -> str:
        return "测试报告分析完成：本次测试通过率较高，建议重点关注失败的P0级用例。"


class OpenAIProvider(AIProvider):
    """OpenAI服务提供商（GPT系列）"""
    
    def __init__(self, api_key: str, base_url: str = "https://api.openai.com/v1", model: str = "gpt-4"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
    
    async def _call_api(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature
                }
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
    
    async def generate_test_cases(self, requirement_text: str) -> Dict[str, Any]:
        system_prompt = """你是一个专业的测试用例生成专家。根据需求描述，生成严格且合法的JSON格式的测试用例。
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
}
    ]
}"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请根据以下需求生成测试用例：\n{requirement_text}"}
        ]
        content = await self._call_api(messages, temperature=0.8)
        return extract_json_from_llm_response(content)
    
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        return await self._call_api(messages)
    
    async def analyze_report(self, report_data: Dict[str, Any]) -> str:
        system_prompt = "你是一个专业的测试报告分析师。请根据提供的测试数据，给出专业的分析和建议。"
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请分析以下测试报告：\n{json.dumps(report_data, ensure_ascii=False)}"}
        ]
        return await self._call_api(messages, temperature=0.6)


class ClaudeProvider(AIProvider):
    """Anthropic Claude服务提供商"""
    
    def __init__(self, api_key: str, base_url: str = "https://api.anthropic.com", model: str = "claude-3-opus-20240229"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
    
    async def _call_api(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": 4096,
                    "temperature": temperature
                }
            )
            response.raise_for_status()
            return response.json()["content"][0]["text"]
    
    async def generate_test_cases(self, requirement_text: str) -> Dict[str, Any]:
        system_prompt = """你是一个专业的测试用例生成专家。根据需求描述，生成严格且合法的JSON格式的测试用例。
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
}
    ]
}"""
        messages = [
            {"role": "user", "content": f"{system_prompt}\n\n请根据以下需求生成测试用例：\n{requirement_text}"}
        ]
        content = await self._call_api(messages, temperature=0.8)
        return extract_json_from_llm_response(content)
    
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        return await self._call_api(messages)
    
    async def analyze_report(self, report_data: Dict[str, Any]) -> str:
        system_prompt = "你是一个专业的测试报告分析师。请根据提供的测试数据，给出专业的分析和建议。"
        messages = [
            {"role": "user", "content": f"{system_prompt}\n\n请分析以下测试报告：\n{json.dumps(report_data, ensure_ascii=False)}"}
        ]
        return await self._call_api(messages, temperature=0.6)


class QwenProvider(AIProvider):
    """阿里云通义千问服务提供商"""
    
    def __init__(self, api_key: str, base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1", model: str = "qwen-plus"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
    
    async def _call_api(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature
                }
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
    
    async def generate_test_cases(self, requirement_text: str) -> Dict[str, Any]:
        system_prompt = """你是一个专业的测试用例生成专家。根据需求描述，生成严格且合法的JSON格式的测试用例。
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
}
    ]
}"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请根据以下需求生成测试用例：\n{requirement_text}"}
        ]
        content = await self._call_api(messages, temperature=0.8)
        return extract_json_from_llm_response(content)
    
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        return await self._call_api(messages)
    
    async def analyze_report(self, report_data: Dict[str, Any]) -> str:
        system_prompt = "你是一个专业的测试报告分析师。请根据提供的测试数据，给出专业的分析和建议。"
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请分析以下测试报告：\n{json.dumps(report_data, ensure_ascii=False)}"}
        ]
        return await self._call_api(messages, temperature=0.6)


class ErnieProvider(AIProvider):
    """百度文心一言服务提供商"""
    
    def __init__(self, api_key: str, base_url: str = "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop", model: str = "ernie-4.0"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self._access_token: Optional[str] = None
    
    async def _get_access_token(self) -> str:
        if self._access_token:
            return self._access_token
        # 简化实现，实际需要获取access token
        return self.api_key
    
    async def _call_api(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # 百度API格式有所不同，这里简化处理
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {await self._get_access_token()}", "Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature
                }
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
    
    async def generate_test_cases(self, requirement_text: str) -> Dict[str, Any]:
        system_prompt = """你是一个专业的测试用例生成专家。根据需求描述，生成严格且合法的JSON格式的测试用例。
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
}
    ]
}"""
        messages = [
            {"role": "user", "content": f"{system_prompt}\n\n请根据以下需求生成测试用例：\n{requirement_text}"}
        ]
        content = await self._call_api(messages, temperature=0.8)
        return extract_json_from_llm_response(content)
    
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        return await self._call_api(messages)
    
    async def analyze_report(self, report_data: Dict[str, Any]) -> str:
        system_prompt = "你是一个专业的测试报告分析师。请根据提供的测试数据，给出专业的分析和建议。"
        messages = [
            {"role": "user", "content": f"{system_prompt}\n\n请分析以下测试报告：\n{json.dumps(report_data, ensure_ascii=False)}"}
        ]
        return await self._call_api(messages, temperature=0.6)


class DeepSeekProvider(AIProvider):
    """DeepSeek服务提供商"""

    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com/v1", model: str = "deepseek-chat"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model

    async def _call_api(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature
                }
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

    async def generate_test_cases(self, requirement_text: str) -> Dict[str, Any]:
        system_prompt = """你是一个专业的测试用例生成专家。根据需求描述，生成严格且合法的JSON格式的测试用例。
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
}
    ]
}"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请根据以下需求生成测试用例：\n{requirement_text}"}
        ]
        content = await self._call_api(messages, temperature=0.8)
        return extract_json_from_llm_response(content)

    async def chat(self, messages: List[Dict[str, str]]) -> str:
        return await self._call_api(messages)

    async def analyze_report(self, report_data: Dict[str, Any]) -> str:
        system_prompt = "你是一个专业的测试报告分析师。请根据提供的测试数据，给出专业的分析和建议。"
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请分析以下测试报告：\n{json.dumps(report_data, ensure_ascii=False)}"}
        ]
        return await self._call_api(messages, temperature=0.6)


class KimiProvider(AIProvider):
    """Kimi（月之暗面）服务提供商"""

    def __init__(self, api_key: str, base_url: str = "https://api.moonshot.cn/v1", model: str = "moonshot-v1-8k"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model

    async def _call_api(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature
                }
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

    async def generate_test_cases(self, requirement_text: str) -> Dict[str, Any]:
        system_prompt = """你是一个专业的测试用例生成专家。根据需求描述，生成严格且合法的JSON格式的测试用例。
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
}
    ]
}"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请根据以下需求生成测试用例：\n{requirement_text}"}
        ]
        content = await self._call_api(messages, temperature=0.8)
        return extract_json_from_llm_response(content)

    async def chat(self, messages: List[Dict[str, str]]) -> str:
        return await self._call_api(messages)

    async def analyze_report(self, report_data: Dict[str, Any]) -> str:
        system_prompt = "你是一个专业的测试报告分析师。请根据提供的测试数据，给出专业的分析和建议。"
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请分析以下测试报告：\n{json.dumps(report_data, ensure_ascii=False)}"}
        ]
        return await self._call_api(messages, temperature=0.6)


# 可用的提供商配置
PROVIDER_CONFIGS = {
    "mock": {
        "name": "Mock (测试用)",
        "models": ["mock-model"],
        "default_model": "mock-model",
        "provider_class": MockProvider
    },
    "openai": {
        "name": "OpenAI (GPT)",
        "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
        "default_model": "gpt-4",
        "default_base_url": "https://api.openai.com/v1",
        "provider_class": OpenAIProvider
    },
    "claude": {
        "name": "Anthropic Claude",
        "models": ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
        "default_model": "claude-3-opus-20240229",
        "default_base_url": "https://api.anthropic.com",
        "provider_class": ClaudeProvider
    },
    "qwen": {
        "name": "通义千问",
        "models": ["qwen-plus", "qwen-turbo", "qwen-max"],
        "default_model": "qwen-plus",
        "default_base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "provider_class": QwenProvider
    },
    "ernie": {
        "name": "文心一言",
        "models": ["ernie-4.0", "ernie-3.5", "ernie-lite"],
        "default_model": "ernie-4.0",
        "default_base_url": "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop",
        "provider_class": ErnieProvider
    },
    "deepseek": {
        "name": "DeepSeek",
        "models": ["deepseek-chat", "deepseek-coder"],
        "default_model": "deepseek-chat",
        "default_base_url": "https://api.deepseek.com/v1",
        "provider_class": DeepSeekProvider
    },
    "kimi": {
        "name": "Kimi (月之暗面)",
        "models": ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
        "default_model": "moonshot-v1-8k",
        "default_base_url": "https://api.moonshot.cn/v1",
        "provider_class": KimiProvider
    }
}


# 全局AI服务实例
_ai_provider: Optional[AIProvider] = None


def get_ai_provider() -> AIProvider:
    """获取当前配置的AI提供商"""
    global _ai_provider
    if _ai_provider is None:
        from app.models.domain import get_db_session
        # 从数据库读取配置
        db = next(get_db_session())
        try:
            from sqlalchemy import text
            result = db.execute(text("SELECT * FROM config WHERE key = 'ai_provider'")).first()
            provider_type = result[2] if result else settings.AI_PROVIDER
            
            result = db.execute(text("SELECT * FROM config WHERE key = 'ai_api_key'")).first()
            api_key = result[2] if result else settings.AI_API_KEY
            
            result = db.execute(text("SELECT * FROM config WHERE key = 'ai_base_url'")).first()
            base_url = result[2] if result else settings.AI_BASE_URL
            
            result = db.execute(text("SELECT * FROM config WHERE key = 'ai_model_name'")).first()
            model_name = result[2] if result else settings.AI_MODEL_NAME
            
            provider_config = PROVIDER_CONFIGS.get(provider_type, PROVIDER_CONFIGS["mock"])
            provider_class = provider_config["provider_class"]
            
            if provider_type == "mock":
                _ai_provider = provider_class()
            else:
                if not base_url:
                    base_url = provider_config.get("default_base_url", "")
                if not model_name:
                    model_name = provider_config["default_model"]
                _ai_provider = provider_class(api_key=api_key, base_url=base_url, model=model_name)
        except:
            _ai_provider = MockProvider()
        finally:
            db.close()
    return _ai_provider


def reset_ai_provider():
    """重置AI提供商实例（配置变更后调用）"""
    global _ai_provider
    _ai_provider = None
