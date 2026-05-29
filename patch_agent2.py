import os

file_path = '/Users/bytedance/Documents/AutoTestRunner/src/autotest_runner/agent/agent.py'

with open(file_path, 'r') as f:
    content = f.read()

old_str = """            output = []
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
            output.append("-" * 60 + "\\n")"""

new_str = """            output = []
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            initial_logs = [
                f"[{current_time}] 🚀 接收到云端测试任务下发 (Task ID: {task_id})\\n",
                f"[{current_time}] 🎯 选中执行节点: {self.agent_name} (ID: {self.agent_id})\\n",
                f"[{current_time}] 📁 准备工作目录: {cwd}\\n",
                f"[{current_time}] ⚙️ 开始拉起执行命令: {test_command}\\n",
                "-" * 60 + "\\n"
            ]
            output.extend(initial_logs)
            self._append_task_log(task_id, "".join(initial_logs))
            
            process = subprocess.Popen(
                test_command,
                shell=True,
                cwd=cwd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )
            
            log_buffer = []
            last_flush_time = time.time()
            
            for line in process.stdout:
                logger.info(f"[Task {task_id}] {line.strip()}")
                output.append(line)
                log_buffer.append(line)
                
                if time.time() - last_flush_time > 2.0 or len(log_buffer) > 20:
                    self._append_task_log(task_id, "".join(log_buffer))
                    log_buffer = []
                    last_flush_time = time.time()
                    
            if log_buffer:
                self._append_task_log(task_id, "".join(log_buffer))
                
            process.wait()
            
            finish_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            finish_logs = ["-" * 60 + "\\n"]
            output.extend(finish_logs)
            self._append_task_log(task_id, "".join(finish_logs))"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Replaced execution block")
else:
    print("Could not find execution block")


old_status = """    def _update_task_status("""
new_status = """    def _append_task_log(self, task_id: str, log_data: str):
        \"\"\"实时追加日志\"\"\"
        if not log_data:
            return
        try:
            url = f"{self.server_url}/api/execution-queue/{task_id}/log"
            requests.post(url, json={"log": log_data}, timeout=5)
        except Exception as e:
            logger.error(f"Failed to append task log: {e}")

    def _update_task_status("""

if old_status in content:
    content = content.replace(old_status, new_status)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Replaced status block")
else:
    print("Could not find status block")

