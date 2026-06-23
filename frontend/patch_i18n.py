import os

def replace_in_file(filepath, replacements):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

# 1. DefectManagement.tsx
replace_in_file("/Users/bytedance/Documents/AutoTestHub/frontend/src/pages/DefectManagement.tsx", [
    ("message.success('Defect deleted successfully')", "message.success('缺陷删除成功')"),
    ("message.success('Defect updated successfully')", "message.success('缺陷更新成功')"),
    ("message.success('Defect created successfully')", "message.success('缺陷创建成功')"),
    ('title="Defect Management"', 'title="缺陷管理"'),
    ('title={editingDefect ? "Edit Defect" : "Add Defect"}', 'title={editingDefect ? "编辑缺陷" : "新增缺陷"}'),
    ('label="Title"', 'label="标题"'),
    ('label="Description"', 'label="描述"'),
    ('label="Severity"', 'label="严重程度"'),
    ('label="Priority"', 'label="优先级"'),
    ('label="Status"', 'label="状态"'),
    ('label="Test Case"', 'label="测试用例"'),
    ('label="External ID"', 'label="外部 ID"'),
    ('label="External URL"', 'label="外部链接"'),
    ("title: 'Title'", "title: '标题'"),
    ("title: 'Severity'", "title: '严重程度'"),
    ("title: 'Status'", "title: '状态'"),
    ("title: 'Priority'", "title: '优先级'"),
    ("title: 'Created At'", "title: '创建时间'"),
    ("title: 'Actions'", "title: '操作'"),
    (">Edit<", ">编辑<"),
    (">Delete<", ">删除<"),
    ('type="primary">New Defect', 'type="primary">新增缺陷'),
    ('>Open<', '>新建 (Open)<'),
    ('>In Progress<', '>处理中 (In Progress)<'),
    ('>Resolved<', '>已解决 (Resolved)<'),
    ('>Closed<', '>已关闭 (Closed)<'),
    ('>Critical<', '>致命 (Critical)<'),
    ('>High<', '>高 (High)<'),
    ('>Medium<', '>中 (Medium)<'),
    ('>Low<', '>低 (Low)<'),
    ('value="open">Open', 'value="open">新建 (Open)'),
    ('value="in_progress">In Progress', 'value="in_progress">处理中 (In Progress)'),
    ('value="resolved">Resolved', 'value="resolved">已解决 (Resolved)'),
    ('value="closed">Closed', 'value="closed">已关闭 (Closed)'),
    ('value="critical">Critical', 'value="critical">致命 (Critical)'),
    ('value="high">High', 'value="high">高 (High)'),
    ('value="medium">Medium', 'value="medium">中 (Medium)'),
    ('value="low">Low', 'value="low">低 (Low)')
])

# 2. VersionIterations.tsx
replace_in_file("/Users/bytedance/Documents/AutoTestHub/frontend/src/pages/VersionIterations.tsx", [
    ("message.success('Iteration deleted successfully')", "message.success('迭代删除成功')"),
    ("message.success('Iteration updated successfully')", "message.success('迭代更新成功')"),
    ("message.success('Iteration created successfully')", "message.success('迭代创建成功')"),
    ('title="Version Iterations"', 'title="版本与迭代"'),
    ('title={editingIteration ? "Edit Iteration" : "New Iteration"}', 'title={editingIteration ? "编辑迭代" : "新增迭代"}'),
    ('type="primary">New Iteration', 'type="primary">新增迭代'),
    ('label="Name"', 'label="名称"'),
    ('label="Type"', 'label="类型"'),
    ('label="Description"', 'label="描述"'),
    ('label="Date Range"', 'label="起止时间"'),
    ("title: 'Name'", "title: '名称'"),
    ("title: 'Type'", "title: '类型'"),
    ("title: 'Status'", "title: '状态'"),
    ("title: 'Progress'", "title: '进度'"),
    ("title: 'Actions'", "title: '操作'"),
    (">Version<", ">版本 (Version)<"),
    (">Sprint<", ">冲刺 (Sprint)<"),
    (">Planned<", ">计划中 (Planned)<"),
    (">In Progress<", ">进行中 (In Progress)<"),
    (">Completed<", ">已完成 (Completed)<"),
    ('value="version">Version', 'value="version">版本 (Version)'),
    ('value="sprint">Sprint', 'value="sprint">冲刺 (Sprint)'),
    ('value="planned">Planned', 'value="planned">计划中 (Planned)'),
    ('value="in_progress">In Progress', 'value="in_progress">进行中 (In Progress)'),
    ('value="completed">Completed', 'value="completed">已完成 (Completed)')
])

# 3. Toolbox.tsx
replace_in_file("/Users/bytedance/Documents/AutoTestHub/frontend/src/pages/Toolbox.tsx", [
    ("message.success('Tool instance deleted')", "message.success('工具实例删除成功')"),
    ("message.success('Tool instance updated')", "message.success('工具实例更新成功')"),
    ("message.success('Tool instance created')", "message.success('工具实例创建成功')"),
    ("message.success('Tool executed successfully')", "message.success('工具执行成功')"),
    ('title="Toolbox"', 'title="工具箱"'),
    ('title={editingInstance ? "Edit Tool Instance" : "New Tool Instance"}', 'title={editingInstance ? "编辑工具实例" : "新增工具实例"}'),
    ('type="primary">New Tool Instance', 'type="primary">新增工具实例'),
    ('title="Execute Tool"', 'title="执行工具"'),
    ('label="Name"', 'label="名称"'),
    ('label="Tool Definition"', 'label="工具定义"'),
    ('label="Config (JSON)"', 'label="配置 (JSON)"'),
    ('label="Parameters (JSON)"', 'label="执行参数 (JSON)"'),
    ("title: 'Name'", "title: '名称'"),
    ("title: 'Tool Type'", "title: '工具类型'"),
    ("title: 'Status'", "title: '状态'"),
    ("title: 'Actions'", "title: '操作'"),
    (">Active<", ">活跃 (Active)<"),
    (">Inactive<", ">未激活 (Inactive)<"),
    (">Execute<", ">执行<"),
    ('value="active">Active', 'value="active">活跃 (Active)'),
    ('value="inactive">Inactive', 'value="inactive">未激活 (Inactive)')
])

# 4. IntegrationConfig.tsx
replace_in_file("/Users/bytedance/Documents/AutoTestHub/frontend/src/pages/IntegrationConfig.tsx", [
    ("message.success('Integration deleted successfully')", "message.success('集成删除成功')"),
    ("message.success('Integration updated successfully')", "message.success('集成更新成功')"),
    ("message.success('Integration created successfully')", "message.success('集成创建成功')"),
    ('title="Integration Configurations"', 'title="集成配置"'),
    ('title={editingConfig ? "Edit Integration" : "New Integration"}', 'title={editingConfig ? "编辑集成" : "新增集成"}'),
    ('type="primary">New Integration', 'type="primary">新增集成'),
    ('label="Name"', 'label="名称"'),
    ('label="Integration Type"', 'label="集成类型"'),
    ('label="Platform"', 'label="平台"'),
    ("title: 'Name'", "title: '名称'"),
    ("title: 'Integration Type'", "title: '集成类型'"),
    ("title: 'Status'", "title: '状态'"),
    ("title: 'Actions'", "title: '操作'"),
    ('value="jira">Jira', 'value="jira">Jira'),
    ('value="feishu">Feishu', 'value="feishu">飞书 (Feishu)'),
    (">Jira<", ">Jira<"),
    (">Feishu<", ">飞书 (Feishu)<"),
    ('value="active">Active', 'value="active">活跃 (Active)'),
    ('value="disabled">Disabled', 'value="disabled">已禁用 (Disabled)')
])

# 5. Reports.tsx
replace_in_file("/Users/bytedance/Documents/AutoTestHub/frontend/src/pages/Reports.tsx", [
    ("message.success(result.message)", "message.success('报告生成成功')"),
    ("message.success('Report deleted successfully')", "message.success('报告删除成功')"),
    ('title="Report Management"', 'title="分析与报告"'),
    ('title="Generate Report"', 'title="生成报告"'),
    ('type="primary">Generate Report', 'type="primary">生成报告'),
    ('label="Report Type"', 'label="报告类型"'),
    ('label="Date"', 'label="日期"'),
    ('label="Start Date"', 'label="开始日期"'),
    ("title: 'Report Name'", "title: '报告名称'"),
    ("title: 'Type'", "title: '类型'"),
    ("title: 'Created At'", "title: '生成时间'"),
    ("title: 'Actions'", "title: '操作'"),
    (">Daily Report<", ">日报 (Daily)<"),
    (">Weekly Report<", ">周报 (Weekly)<"),
    ('value="daily">Daily Report', 'value="daily">日报 (Daily)'),
    ('value="weekly">Weekly Report', 'value="weekly">周报 (Weekly)'),
    (">View<", ">查看<"),
    (">Download<", ">下载<")
])

