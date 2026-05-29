import sys

agent_path = '/Users/bytedance/Documents/AutoTestRunner/src/autotest_runner/agent/agent.py'
with open(agent_path, 'r') as f:
    content = f.read()

old_str = '''            elif status in ["completed", "failed"]:
                url = f"{self.server_url}/api/execution-queue/{task_id}/complete"
                requests.post(
                    url,
                    params={
                        "result": result,
                        "error_message": error_message,
                        "success": status == "completed"
                    }
                )'''

new_str = '''            elif status in ["completed", "failed"]:
                url = f"{self.server_url}/api/execution-queue/{task_id}/complete"
                requests.post(
                    url,
                    json={
                        "result": result,
                        "error_message": error_message,
                        "success": status == "completed"
                    }
                )'''

if old_str in content:
    content = content.replace(old_str, new_str)
    with open(agent_path, 'w') as f:
        f.write(content)
    print("Agent patched successfully.")
else:
    print("Could not find old string in agent.py")

