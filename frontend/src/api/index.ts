import axios from 'axios';
import { message } from 'antd';

export const api = axios.create({
    baseURL: 'http://localhost:8000/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        message.error(error.response?.data?.detail || 'API Request Failed');
        return Promise.reject(error);
    }
);

export interface Project {
    id: string;
    name: string;
    description?: string;
    created_at: string;
}

export interface Requirement {
    id: string;
    project_id: string;
    title: string;
    description: string;
    status: string;
    created_at: string;
}

export interface TestCase {
    id: string;
    project_id: string;
    requirement_id?: string;
    local_case_id?: string;
    title: string;
    feature?: string;
    case_category: string;
    priority: string;
    steps: string[];
    expected_result: string;
    status: string;
    created_at: string;
}

export interface ExecutionRun {
    id: string;
    project_id: string;
    name: string;
    status: string;
    created_at: string;
}

export interface ExecutionResult {
    id: string;
    run_id: string;
    test_case_id: string;
    status: string;
    error_message?: string;
    log_url?: string;
    html_report?: string;
    executed_at: string;
}

export const login = async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
};

export const getProjects = async () => {
    const response = await api.get<Project[]>('/projects');
    return response.data;
};

export const createProject = async (name: string, description?: string) => {
    const response = await api.post<Project>('/projects', { name, description });
    return response.data;
};

export const getProject = async (projectId: string) => {
    const response = await api.get<Project>(`/projects/${projectId}`);
    return response.data;
};

export const getRequirements = async (projectId: string) => {
    const response = await api.get<Requirement[]>(`/projects/${projectId}/requirements`);
    return response.data;
};

export const createRequirement = async (projectId: string, title: string, description: string) => {
    const response = await api.post<Requirement>(`/projects/${projectId}/requirements`, { title, description });
    return response.data;
};

export const generateTestCases = async (reqId: string) => {
    const response = await api.post(`/requirements/${reqId}/generate-cases`);
    return response.data;
};

export const generateTestCasesV2 = async (projectId: string, data: { requirement_id?: string; content?: string }) => {
    const response = await api.post(`/projects/${projectId}/generate-cases`, { ...data, project_id: projectId });
    return response.data;
};

export const importJiraRequirements = async (projectId: string, jql: string, projectKey?: string) => {
    const response = await api.post(`/projects/${projectId}/requirements/import-jira`, { jql, project_key: projectKey });
    return response.data;
};

export const getTestCases = async (projectId?: string) => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await api.get<TestCase[]>('/test-cases', { params });
    return response.data;
};

export const adoptTestCase = async (caseId: string) => {
    const response = await api.post(`/test-cases/${caseId}/adopt`);
    return response.data;
};

export const enableTestCase = async (caseId: string) => {
    const response = await api.post(`/test-cases/${caseId}/enable`);
    return response.data;
};

export const getExecutionRuns = async (projectId: string) => {
    const response = await api.get<ExecutionRun[]>(`/projects/${projectId}/execution-runs`);
    return response.data;
};

export const createTestCase = async (projectId: string, caseData: any) => {
  const steps = caseData.steps ? caseData.steps.split('\n').filter((s: string) => s.trim()) : [];
  const response = await api.post<TestCase>(`/projects/${projectId}/test-cases`, { ...caseData, steps });
  return response.data;
};

export const createExecutionRun = async (projectId: string, name: string) => {
  const response = await api.post<ExecutionRun>(`/projects/${projectId}/execution-runs`, { name });
  return response.data;
};

export const deleteTestCase = async (caseId: string) => {
  const response = await api.delete(`/test-cases/${caseId}`);
  return response.data;
};

export const getExecutionResults = async (runId: string) => {
    const response = await api.get<ExecutionResult[]>(`/execution-runs/${runId}/results`);
    return response.data;
};

export const syncTestCases = async (projectId: string, testCases: any[]) => {
    const response = await api.post('/sync/test-cases', { project_id: projectId, test_cases: testCases });
    return response.data;
};


// 配置管理接口
export interface ConfigItem {
    key: string;
    value: string;
    description?: string;
}

export interface ConfigResponse {
    id: string;
    key: string;
    value?: string;
    description?: string;
    updated_at: string;
}

export interface AIProviderInfo {
    type: string;
    name: string;
    models: string[];
    default_model: string;
    default_base_url?: string;
}

export const getAllConfigs = async () => {
    const response = await api.get<ConfigResponse[]>('/config');
    return response.data;
};

export const getConfig = async (key: string) => {
    const response = await api.get<ConfigResponse>(`/config/${key}`);
    return response.data;
};

export const updateConfig = async (key: string, configData: ConfigItem) => {
    const response = await api.put<ConfigResponse>(`/config/${key}`, configData);
    return response.data;
};

export const getAIProviders = async () => {
    const response = await api.get<AIProviderInfo[]>('/ai/providers');
    return response.data;
};

export const getCurrentAIProvider = async () => {
    const response = await api.get('/ai/current-provider');
    return response.data;
};


// AI助手接口
export interface ChatMessage {
    role: string;
    content: string;
}

export interface ChatRequest {
    messages: ChatMessage[];
}

export interface ChatResponse {
    content: string;
}

export const chatWithAI = async (messages: ChatMessage[]) => {
    const response = await api.post<ChatResponse>('/ai/chat', { messages });
    return response.data;
};

export const analyzeReportWithAI = async (reportData: any) => {
    const response = await api.post('/ai/analyze-report', { report_data: reportData });
    return response.data;
};

// 获取单个执行记录
export const getExecutionRun = async (runId: string) => {
    const response = await api.get<ExecutionRun>(`/execution-runs/${runId}`);
    return response.data;
};

// 获取单个测试用例
export const getTestCase = async (caseId: string) => {
    const response = await api.get<TestCase>(`/test-cases/${caseId}`);
    return response.data;
};

// 更新测试用例
export const updateTestCase = async (caseId: string, data: Partial<TestCase>) => {
    const response = await api.put<TestCase>(`/test-cases/${caseId}`, data);
    return response.data;
};

// 分析报告
export const analyzeReport = async (runId: string) => {
    const response = await api.post(`/execution-runs/${runId}/analyze`, {});
    return response.data.analysis || response.data;
};

// 设备和 Agent 管理接口
export interface Device {
    id: string;
    name: string;
    device_id: string;
    device_type: string;
    status: string;
    agent_id?: string;
    pool_id?: string;
    tags?: string[];
    last_heartbeat?: string;
    created_at: string;
}

export interface DevicePool {
    id: string;
    name: string;
    description?: string;
    created_at: string;
}

export interface Agent {
    id: string;
    name: string;
    description?: string;
    host?: string;
    os?: string;
    cpu_cores?: number;
    memory?: string;
    disk_space?: string;
    tags?: string[];
    status: string;
    health_score?: number;
    last_heartbeat?: string;
    created_at: string;
}

export interface ExecutionQueueItem {
    id: string;
    run_id: string;
    device_id?: string;
    agent_id?: string;
    status: string;
    priority: number;
    result?: string;
    error_message?: string;
    queued_at: string;
    started_at?: string;
    completed_at?: string;
}

export const getAgents = async (status?: string) => {
    const params = status ? { status } : {};
    const response = await api.get<Agent[]>('/agents', { params });
    return response.data;
};

export const getAgent = async (agentId: string) => {
    const response = await api.get<Agent>(`/agents/${agentId}`);
    return response.data;
};

export const createAgent = async (data: Partial<Agent>) => {
    const response = await api.post<Agent>('/agents', data);
    return response.data;
};

export const updateAgent = async (agentId: string, data: Partial<Agent>) => {
    const response = await api.put<Agent>(`/agents/${agentId}`, data);
    return response.data;
};

export const deleteAgent = async (agentId: string) => {
    const response = await api.delete(`/agents/${agentId}`);
    return response.data;
};

export const getDevices = async (params?: { status?: string; pool_id?: string; agent_id?: string }) => {
    const response = await api.get<Device[]>('/devices', { params });
    return response.data;
};

export const getDevice = async (deviceId: string) => {
    const response = await api.get<Device>(`/devices/${deviceId}`);
    return response.data;
};

export const getDevicePools = async () => {
    const response = await api.get<DevicePool[]>('/device-pools');
    return response.data;
};

export const getExecutionQueue = async (params?: { status?: string; agent_id?: string }) => {
    const response = await api.get<ExecutionQueueItem[]>('/execution-queue', { params });
    return response.data;
};

export const enqueueExecution = async (params: {
    run_id: string;
    device_id?: string;
    agent_id?: string;
    priority?: number;
}) => {
    const response = await api.post('/execution-queue/enqueue', null, { params });
    return response.data;
};

export const batchEnqueueExecution = async (params: {
    run_id: string;
    priority?: number;
    random_schedule?: boolean;
}) => {
    const response = await api.post('/execution-queue/batch-enqueue', null, { params });
    return response.data;
};


// 定时任务相关API
export interface ScheduledTask {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    cron_expression: string;
    task_type: string;
    enabled: boolean;
    last_run_at?: string;
    next_run_at?: string;
    config?: any;
    created_at: string;
    updated_at: string;
}

export interface TriggerExecutionRequest {
    name: string;
    agent_id?: string;
    device_id?: string;
    priority?: number;
    test_case_ids?: string[];
    working_dir?: string;
    test_command?: string;
}

export const getScheduledTasks = async (projectId: string) => {
    const response = await api.get<ScheduledTask[]>(`/projects/${projectId}/scheduled-tasks`);
    return response.data;
};

export const getScheduledTask = async (taskId: string) => {
    const response = await api.get<ScheduledTask>(`/scheduled-tasks/${taskId}`);
    return response.data;
};

export const createScheduledTask = async (projectId: string, taskData: any) => {
    const response = await api.post<ScheduledTask>(`/projects/${projectId}/scheduled-tasks`, taskData);
    return response.data;
};

export const updateScheduledTask = async (taskId: string, taskData: any) => {
    const response = await api.put<ScheduledTask>(`/scheduled-tasks/${taskId}`, taskData);
    return response.data;
};

export const deleteScheduledTask = async (taskId: string) => {
    const response = await api.delete(`/scheduled-tasks/${taskId}`);
    return response.data;
};

export const triggerScheduledTask = async (taskId: string) => {
    const response = await api.post(`/scheduled-tasks/${taskId}/trigger`);
    return response.data;
};

// 测试计划相关API
export interface TestPlan {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    env?: string;
    working_dir?: string;
    test_command?: string;
    case_filters?: any;
    case_ids?: string[];
    status: string;
    created_at: string;
    updated_at: string;
}

export const getTestPlans = async (projectId: string) => {
    const response = await api.get<TestPlan[]>(`/projects/${projectId}/test-plans`);
    return response.data;
};

export const createTestPlan = async (projectId: string, planData: any) => {
    const response = await api.post<TestPlan>(`/projects/${projectId}/test-plans`, planData);
    return response.data;
};

export const updateTestPlan = async (planId: string, planData: any) => {
    const response = await api.put<TestPlan>(`/test-plans/${planId}`, planData);
    return response.data;
};

export const deleteTestPlan = async (planId: string) => {
    const response = await api.delete(`/test-plans/${planId}`);
    return response.data;
};

export const triggerExecution = async (projectId: string, request: TriggerExecutionRequest) => {
    const response = await api.post(`/projects/${projectId}/trigger-execution`, request);
    return response.data;
};

