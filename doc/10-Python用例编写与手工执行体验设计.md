# Python 用例编写与手工执行体验设计

## 1. 设计目标

平台用例体系分为两大类：

| 大类 | 说明 |
| --- | --- |
| manual | 手工测试用例，由测试人员在平台上执行、记录证据、关联缺陷 |
| automated | 自动化测试用例，统一使用 Python 编写和执行 |

这样设计的目标：

- 降低测试团队上手成本，统一自动化技术栈。
- AI 生成用例时直接给出“是否适合自动化”的判断。
- 手工用例执行体验足够顺滑，方便上传图片、记录复现、关联缺陷。
- 自动化用例和平台用例有明确绑定关系，方便版本管理和执行追踪。

## 2. AI 生成用例要求

AI 生成测试用例时必须输出以下字段：

| 字段 | 说明 |
| --- | --- |
| case_category | manual 或 automated |
| automation_supported | true/false |
| automation_reason | 为什么适合或不适合自动化 |
| automation_type | api/app_ui/adb/serial/toolbox/mixed |
| automation_language | 固定为 Python |
| automation_script_suggestion | 建议的 Python 文件、类、函数和实现思路 |
| manual_execution_tips | 手工执行注意事项、证据采集建议 |
| defect_suggestion | 失败时建议关联或创建缺陷的字段 |

AI 输出示例：

```json
{
  "title": "验证低电量状态下 App 告警展示",
  "case_category": "automated",
  "automation_supported": true,
  "automation_reason": "可通过继电器/电源模拟低电量，并通过 uiautomator2 校验 App UI",
  "automation_type": "mixed",
  "automation_language": "python",
  "automation_script_suggestion": {
    "file_path": "automation/projects/smart_lock/cases/test_low_battery.py",
    "class_name": "TestLowBattery",
    "function_name": "test_app_alert_when_low_battery"
  },
  "manual_execution_tips": [
    "记录设备 SN、固件版本和 App 版本",
    "失败时上传 App 截图和串口日志"
  ]
}
```

## 3. Python 自动化规范

### 3.1 默认框架

推荐使用：

- Python 3.12。
- pytest。
- uiautomator2。
- pyserial。
- adbutils 或 subprocess adb。
- 平台 SDK，用于读取用例参数、上报日志、上传附件、调用工具箱。

### 3.2 推荐目录

```text
automation/
  projects/
    smart_lock/
      cases/
        test_low_power.py
        test_app_login.py
      pages/
      fixtures/
      tools/
      requirements.txt
```

### 3.3 Python 用例示例

```python
import pytest


@pytest.mark.low_power
@pytest.mark.regression
def test_standby_current_less_than_threshold(context):
    power = context.tools.power_meter("lab-power-ch1")
    relay = context.tools.relay("lab-relay-01")

    relay.power_cycle(channel=1, off_seconds=5)
    result = power.measure(duration_seconds=60, sample_rate=10)

    context.attach_json("power_result", result)
    assert result["avg_current_ma"] < 120
```

### 3.4 平台绑定关系

| 字段 | 说明 |
| --- | --- |
| repo_url | Git 仓库地址 |
| branch | 分支或 tag |
| commit_sha | 固定提交，可选 |
| file_path | Python 文件路径 |
| module_name | Python 模块名 |
| class_name | 测试类名，可为空 |
| function_name | 测试函数名 |
| pytest_markers | pytest marker |
| runtime_config | Python 版本、依赖、环境变量 |

## 4. 手工执行体验

### 4.1 手工执行页面

手工执行用例集需要以“少输入、快上传、易复现、能建缺陷”为核心。

页面能力：

| 区域 | 能力 |
| --- | --- |
| 用例列表 | 上一条/下一条、只看失败、只看未执行、按模块筛选 |
| 步骤区 | 每步标记通过/失败/阻塞，填写实际结果 |
| 快捷结果 | 一键通过、一键失败、一键阻塞、批量通过 |
| 证据区 | 拖拽上传、粘贴截图、扫码上传、自动采集日志 |
| 复现区 | 手写复现步骤，或由 AI 根据步骤和实际结果生成 |
| 缺陷区 | 关联已有缺陷，或创建 Jira/飞书/平台缺陷 |
| 草稿区 | 保存草稿、恢复执行、离开页面提醒 |

### 4.2 手工执行结果字段

| 字段 | 说明 |
| --- | --- |
| status | passed/failed/blocked/skipped |
| actual_result | 实际结果 |
| step_actual_results | 每个步骤实际结果 |
| reproduce_steps | 复现步骤，失败时必填或 AI 生成 |
| attachments | 图片、视频、日志、压缩包 |
| environment_snapshot | 设备、固件、App、网络、账号等环境信息 |
| defect_links | Jira、飞书项目或平台缺陷链接 |
| execution_note | 执行备注 |
| blocker_reason | 阻塞原因 |

### 4.3 图片上传体验

支持：

- 拖拽上传到用例或步骤。
- 剪贴板直接粘贴截图。
- 手机扫码上传到当前用例执行记录。
- 从 App UI 自动化或 ADB 截图自动带入。
- 图片上传后可标注圈选重点区域。
- 附件可一键带入缺陷单。

### 4.4 复现步骤

失败时复现步骤可来自：

- 用例原始步骤。
- 执行人员填写的实际结果。
- 步骤级失败备注。
- AI 根据执行记录自动生成。

复现步骤模板：

```text
1. 测试环境：设备 SN、硬件版本、固件版本、App 版本、网络环境
2. 前置条件：账号、设备状态、依赖服务
3. 操作步骤：按实际执行步骤生成
4. 实际结果：失败现象
5. 预期结果：用例预期
6. 附件：截图、视频、日志
```

## 5. 缺陷关联

### 5.1 支持来源

| 来源 | 说明 |
| --- | --- |
| platform | 平台内部缺陷 |
| jira | Jira Issue |
| feishu_project | 飞书项目工作项 |

### 5.2 关联方式

- 粘贴 Jira/飞书缺陷链接自动识别。
- 搜索已有缺陷并关联。
- 根据失败结果创建平台内部缺陷。
- 从平台内部缺陷同步创建 Jira/飞书缺陷。
- 一个执行失败结果可以关联多个缺陷。

### 5.3 创建缺陷草稿

AI 可根据以下内容生成缺陷草稿：

- 用例标题和预期结果。
- 手工执行实际结果。
- 复现步骤。
- 环境快照。
- 图片、视频、日志附件。
- 失败日志 AI 摘要。

缺陷草稿字段：

| 字段 | 说明 |
| --- | --- |
| title | 缺陷标题 |
| description | 缺陷描述 |
| reproduce_steps | 复现步骤 |
| expected_result | 预期结果 |
| actual_result | 实际结果 |
| environment | 环境信息 |
| severity | 严重级别 |
| priority | 优先级 |
| attachments | 附件 |

## 6. 数据流

```text
AI 生成用例
  -> 标注 manual/automated 和 automation_supported
  -> 人工采纳/评审
  -> automated 绑定 Python 脚本
  -> manual 配置执行模板和证据要求
  -> 加入用例集
  -> 执行
  -> 自动化上传日志/附件，手工填写实际结果/上传图片
  -> 失败时关联或创建缺陷
  -> 报告汇总
```

## 7. MVP 建议

第一阶段必须支持：

- 用例大类：manual/automated。
- 自动化语言固定 Python。
- Python 自动化绑定字段。
- 手工执行实际结果、复现步骤、图片/日志上传。
- Jira/飞书缺陷链接字段。
- AI 生成用例时输出自动化可行性判断。

第二阶段增强：

- 手机扫码上传图片。
- AI 生成缺陷草稿。
- 自动识别 Jira/飞书链接。
- 平台缺陷同步创建 Jira/飞书工作项。
- Python 用例在线模板和脚手架生成。

## 8. 自动化用例报告和公共日志模块

Python 自动化用例不需要重复编写公共日志采集代码。框架在执行生命周期中自动完成：

- pre_case 初始化设备状态。
- pre_case 启动串口和 logcat 采集。
- case_run 执行 Python 用例。
- post_case 根据结果自动拉取日志、截图和环境快照。
- post_case 上传失败日志到云端存储。
- report 生成失败日志链接。

自动化报告必须包含：

| 内容 | 说明 |
| --- | --- |
| 用例结果 | passed/failed/skipped/interrupted/error |
| 错误摘要 | 断言失败、异常栈、失败步骤 |
| pytest 日志链接 | Python stdout/stderr、pytest json/junit |
| 串口日志链接 | 按用例时间窗口切片后的串口日志 |
| ADB logcat 链接 | 当前用例执行期间 logcat |
| 截图链接 | 失败时截图 |
| UI XML 链接 | App UI 失败时控件树 |
| 环境快照 | 设备、App、固件、网络、电量等 |

推荐策略：

- 通过用例默认不上传完整大日志，只保留摘要。
- 失败用例必须上传完整失败日志。
- 报告只展示摘要和链接。
- 链接来自可配置存储，如 MinIO、S3、飞书云盘、NAS。

## 9. 自动化用例标准执行模式 (Try-Except-Finally)

在智能硬件与嵌入式测试中，设备掉线、串口卡死、App 崩溃等非预期异常极易发生。单纯依赖 `pytest` 的原生断言往往会导致用例直接中断，进而遗漏环境清理和关键日志收集。

因此，框架强制或推荐在底层封装 **Try-Except-Finally** 模式的执行器（或作为 pytest 的核心 fixture/装饰器）。

### 9.1 异常分类 (Exception Taxonomy)

自动化用例抛出的异常应被严格分类，以便报告系统进行失败聚类：

| 异常类型 | 触发场景 | 报告状态 |
| --- | --- | --- |
| `AssertionError` | 业务逻辑验证失败（如预期返回值不符） | `failed` (失败) |
| `DeviceOfflineError` | ADB 掉线、串口设备无响应、网络断开 | `error` / `interrupted` (环境异常) |
| `TimeoutError` | 步骤执行超时，未在规定时间内获取到状态 | `failed` (超时失败) |
| `FrameworkError` | 平台执行器、测试脚本语法或依赖库报错 | `error` (框架错误) |

### 9.2 Try-Except-Finally 模板实现

无论是用户自己编写复杂脚本，还是平台底层的执行引擎，都遵循以下结构：

```python
def run_test_case_wrapper(case_context):
    try:
        # 1. 前置准备 (Pre-case Hook)
        framework.init_environment(case_context)
        
        # 2. 执行核心用例步骤
        execute_business_logic(case_context)
        
    except AssertionError as e:
        # 捕获业务断言失败
        case_context.mark_failed(reason=str(e))
        logger.error(f"业务断言失败: {e}")
        
    except (DeviceOfflineError, TimeoutError) as e:
        # 捕获设备或环境级异常
        case_context.mark_error(reason=f"环境异常: {e}")
        logger.error(f"设备环境异常: {e}")
        
    except Exception as e:
        # 兜底捕获未知代码崩溃
        case_context.mark_error(reason=f"未知脚本错误: {e}")
        logger.exception("框架或脚本发生未知崩溃")
        
    finally:
        # 3. 后置清理与日志采集 (Post-case Hook 绝对兜底)
        # 无论成功、失败还是设备掉线，finally 保证证据一定被收集，硬件锁一定被释放
        try:
            framework.collect_logs_and_artifacts(case_context)
            framework.teardown_environment(case_context)
        except Exception as cleanup_error:
            logger.error(f"清理阶段发生异常: {cleanup_error}")
```

### 9.3 优势
1. **防脏数据**：保证上一个失败的用例不会导致设备状态“脏”留给下一个用例（如继电器未断电）。
2. **证据必达**：`finally` 确保即使断言报错，串口日志和 logcat 也能被拉取上传。
3. **精准定责**：通过 `except` 分支精细化区分是“产品有 Bug (failed)”还是“测试环境不稳定 (error)”。
