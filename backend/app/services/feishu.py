import httpx
from fastapi import HTTPException
from app.core.config import settings
from app.models.domain import Config
from sqlalchemy.orm import Session

class FeishuService:
    @staticmethod
    def get_config(db: Session, key: str, default: str = "") -> str:
        # 优先读取环境变量 (settings)
        env_val = getattr(settings, key.upper(), None)
        if env_val:
            return env_val
        # 否则从数据库配置表里查找
        db_config = db.query(Config).filter(Config.key == key.lower()).first()
        if db_config and db_config.value:
            return db_config.value
        return default

    async def get_app_access_token(self, db: Session) -> str:
        app_id = self.get_config(db, "feishu_app_id")
        app_secret = self.get_config(db, "feishu_app_secret")
        print(f"DEBUG CREDENTIALS: app_id={app_id}, app_secret={app_secret[:6] if app_secret else ''}****", flush=True)
        
        if not app_id or not app_secret:
            raise HTTPException(status_code=400, detail="飞书 App ID 或 Secret 未配置，请联系系统管理员")

        url = "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json={
                    "app_id": app_id,
                    "app_secret": app_secret
                }, timeout=10.0)
                res_data = response.json()
                print(f"DEBUG TOKEN RESPONSE: {res_data}", flush=True)
                if res_data.get("code") != 0:
                    raise HTTPException(status_code=400, detail=f"获取飞书 App Access Token 失败: {res_data.get('msg')}")
                return res_data["app_access_token"]
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"与飞书服务通信异常: {str(e)}")

    async def get_user_info(self, db: Session, code: str) -> dict:
        app_access_token = await self.get_app_access_token(db)
        print(f"DEBUG TOKEN USED: {app_access_token[:15]}...", flush=True)
        url = "https://open.feishu.cn/open-apis/authen/v1/access_token"
        headers = {
            "Authorization": f"Bearer {app_access_token}",
            "Content-Type": "application/json; charset=utf-8"
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json={
                    "grant_type": "authorization_code",
                    "code": code
                }, headers=headers, timeout=10.0)
                res_data = response.json()
                print(f"DEBUG USER RESPONSE: {res_data}", flush=True)
                if res_data.get("code") != 0:
                    raise HTTPException(status_code=400, detail=f"解析飞书授权 Code 失败: {res_data.get('msg')}")
                return res_data.get("data", {})
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"向飞书换取用户信息通信异常: {str(e)}")

feishu_service = FeishuService()
