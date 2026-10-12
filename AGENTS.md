# 跨智能体记忆约定

## 项目简介
AutoTestHub 是一个面向自动化测试的平台，后端使用 FastAPI，前端使用 React + TypeScript + Vite + Ant Design。主要业务代码在 `backend/app` 和 `frontend/src`。

## 常用命令
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

cd frontend
npm install
npm run dev
npm run build
```

## 约定
- 尽量沿用现有的 FastAPI + React 分层，不把后端逻辑硬塞进页面。
- 蓝牙/设备类能力优先放后端，前端只做交互和状态展示。
- 新增接口时同步补前端 API 封装，减少页面直连请求。
- 改动时保持局部修改，避免波及无关模块。
- 设备改名如果标准写入不可用，优先降级为本地别名，不直接报错中断流程。
- 发送消息默认按 UTF-8 文本处理，JSON 和原样发送属于显式模式。

## 当前进展
- 执行结果接口继续返回 `artifacts`、耗时和时间字段；报告展开区显示日志、证据 JSON，并渲染 Runner 上传的图卡矫正图、ROI 标注图、局部西门子星裁剪图和 MTF 曲线预览。
- Runner 现在递归收集嵌套 `siemens_star_crop_images` 路径；本地前后端支持展示，远端旧 Hub 仍需重新部署后才能显示这些图片。
- 后端 13 项测试与前端生产构建此前已通过；本次改动主要位于 AutoTestRunner 的图卡定位和证据上传链路。
