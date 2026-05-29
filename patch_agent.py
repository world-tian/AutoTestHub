import os
import sys

file_path = '/Users/bytedance/Documents/AutoTestRunner/src/autotest_runner/agent/agent.py'

with open(file_path, 'r') as f:
    content = f.read()

old_str = """            # 如果 working_dir 不存在，则使用当前目录
            cwd = working_dir if working_dir and os.path.exists(working_dir) else os.getcwd()
            
            logger.info(f"Running command: {test_command} in {cwd}")
            
            process = subprocess.Popen(
                test_command,
                shell=True,
                cwd=cwd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )
            
            output = []
            for line in process.stdout:
                logger.info(f"[Task {task_id}] {line.strip()}")
                output.append(line)
                
            process.wait()
            
            if process.returncode == 0:
                result_status = "Success"
                error_msg = None
                logger.info(f"Task {task_id} completed successfully")
            else:
                result_status = "Failed"
                error_msg = f"Command exited with code {process.returncode}"
                logger.error(f"Task {task_id} failed: {error_msg}")
            
            full_output = "".join(output)
            
            # 更新任务状态为完成
            self._update_task_status(
                task_id, 
                "completed" if process.returncode == 0 else "failed", 
                result=full_output,
                error_message=error_msg
            )"""

new_str = """            # 如果 working_dir 不存在，则使用当前目录
            cwd = working_dir if working_dir and os.path.exists(working_dir) else os.getcwd()
            
            logger.info(f"Running command: {test_command} in {cwd}")
            
            output = []
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            output.append(f"[{current_time}] 🚀 接收到云端测试任务下发 (Task ID: {task_id})\\n")
            output.append(f"[{current_time}] 🎯 选中执行节点: {self.agent_name} (ID: {self.agent_id})\\n")
            output.append(f"[{current_time}] 📁 准备工作目录: {cwd}\\n")
            output.append(f"[{current_time}] ⚙️ 开始拉起执行命令: {test_command}\\n")
            output.append("-" * 60 + "\\n")
            
            process = subprocess.Popen(
                test_command,
                shell=True,
                cwd=cwd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )
            
            for line in process.stdout:
                logger.info(f"[Task {task_id}] {line.strip()}")
                output.append(line)
                
            process.wait()
            
            finish_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            output.append("-" * 60 + "\\n")
            if process.returncode == 0:
                result_status = "Success"
                error_msg = None
                logger.info(f"Task {task_id} completed successfully")
                output.append(f"[{finish_time}] ✅ 执行命令顺利完成，退出码: 0\\n")
            else:
                result_status = "Failed"
                error_msg = f"Command exited with code {process.returncode}"
                logger.error(f"Task {task_id} failed: {error_msg}")
                output.append(f"[{finish_time}] ❌ 执行命令发生异常，退出码: {process.returncode}\\n")
            
            # 寻找生成的 HTML 报告并回传内容
            html_report = None
            reports_dir = os.path.join(cwd, "reports")
            if os.path.exists(reports_dir):
                report_files = [f for f in os.listdir(reports_dir) if f.endswith('.html')]
                if report_files:
                    latest_report_file = max([os.path.join(reports_dir, f) for f in report_files], key=os.path.getctime)
                    try:
                        with open(latest_report_file, 'r', encoding='utf-8') as f:
                            html_report = f.read()
                        output.append(f"[{finish_time}] 📊 成功读取本地 HTML 报告并准备上报云端: {os.path.basename(latest_report_file)}\\n")
                    except Exception as e:
                        logger.error(f"Failed to read html report: {e}")
                        output.append(f"[{finish_time}] ⚠️ 读取本地 HTML 报告失败: {e}\\n")
            
            full_output = "".join(output)
            
            # 更新任务状态为完成
            self._update_task_status(
                task_id, 
                "completed" if process.returncode == 0 else "failed", 
                result=full_output,
                error_message=error_msg,
                html_report=html_report
            )"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Replaced execution block")
else:
    print("Could not find execution block")

old_status = """    def _update_task_status(
        self,
        task_id: str,
        status: str,
        result: str = None,
        error_message: str = None
    ):
        \"\"\"更新任务状态\"\"\"
        try:
            if status == "running":
                url = f"{self.server_url}/api/execution-queue/{task_id}/start"
                requests.post(url)
            elif status in ["completed", "failed"]:
                url = f"{self.server_url}/api/execution-queue/{task_id}/complete"
                requests.post(
                    url,
                    json={
                        "result": result,
                        "error_message": error_message,
                        "success": status == "completed"
                    }
                )
        except Exception as e:
            logger.error(f"Failed to update task status: {e}")"""

new_status = """    def _update_task_status(
        self,
        task_id: str,
        status: str,
        result: str = None,
        error_message: str = None,
        html_report: str = None
    ):
        \"\"\"更新任务状态\"\"\"
        try:
            if status == "running":
                url = f"{self.server_url}/api/execution-queue/{task_id}/start"
                requests.post(url)
            elif status in ["completed", "failed"]:
                url = f"{self.server_url}/api/execution-queue/{task_id}/complete"
                payload = {
                    "result": result,
                    "error_message": error_message,
                    "success": status == "completed"
                }
                if html_report:
                    payload["html_report"] = html_report
                requests.post(url, json=payload)
        except Exception as e:
            logger.error(f"Failed to update task status: {e}")"""

if old_status in content:
    content = content.replace(old_status, new_status)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Replaced status block")
else:
    print("Could not find status block")

