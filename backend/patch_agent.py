import sys
import os

agent_path = '/Users/bytedance/Documents/AutoTestRunner/src/autotest_runner/agent/agent.py'
with open(agent_path, 'r') as f:
    content = f.read()

old_str = '''    def _execute_task(self, task: Dict[str, Any]):
        """执行任务"""
        task_id = task.get("task_id")
        run_id = task.get("run_id")
        device_id = task.get("device_id")
        
        logger.info(f"Executing task {task_id} for run {run_id}")
        
        try:
            # 更新任务状态为运行中
            self._update_task_status(task_id, "running")
            
            # TODO: 执行实际测试
            # 这里需要实现从 server 获取测试计划，然后执行
            
            # 模拟执行
            logger.info(f"Executing test on device {device_id}...")
            time.sleep(5)  # 模拟执行时间
            
            # 更新任务状态为完成
            self._update_task_status(task_id, "completed", result="Success")
            logger.info(f"Task {task_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}")
            self._update_task_status(task_id, "failed", error_message=str(e))'''

new_str = '''    def _execute_task(self, task: Dict[str, Any]):
        """执行任务"""
        task_id = task.get("task_id")
        run_id = task.get("run_id")
        device_id = task.get("device_id")
        config = task.get("config", {})
        
        working_dir = config.get("working_dir")
        test_command = config.get("test_command")
        
        logger.info(f"Executing task {task_id} for run {run_id}")
        logger.info(f"  Working Dir: {working_dir}")
        logger.info(f"  Command: {test_command}")
        
        try:
            # 更新任务状态为运行中
            self._update_task_status(task_id, "running")
            
            if not test_command:
                raise ValueError("Test command is not specified (e.g. pytest tests/)")
                
            # 执行实际测试
            logger.info(f"Executing test on device {device_id}...")
            
            import subprocess
            
            # 使用 subprocess 执行命令
            env = os.environ.copy()
            if device_id:
                env["AUTOTEST_DEVICE_ID"] = device_id
            
            # 如果 working_dir 不存在，则使用当前目录
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
            )
            
        except Exception as e:
            logger.error(f"Task {task_id} failed with exception: {e}")
            self._update_task_status(task_id, "failed", error_message=str(e))'''

if old_str in content:
    content = content.replace(old_str, new_str)
    with open(agent_path, 'w') as f:
        f.write(content)
    print("Agent patched successfully.")
else:
    print("Could not find old string in agent.py")

