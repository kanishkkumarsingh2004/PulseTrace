export type AlertMetricType = 'latency_p95' | 'latency_p99' | 'error_rate' | 'throughput_rps' | 'cpu_usage' | 'memory_usage';
export type AlertOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type IncidentState = 'open' | 'acknowledged' | 'resolved';

export interface AlertRuleData {
  id: string;
  projectId: string;
  serviceId?: string;
  name: string;
  metricType: AlertMetricType;
  operator: AlertOperator;
  threshold: number;
  evaluationWindowMinutes: number;
  severity: AlertSeverity;
  enabled: boolean;
}

export interface IncidentData {
  id: string;
  ruleId: string;
  projectId: string;
  serviceId?: string;
  metricType: AlertMetricType;
  threshold: number;
  triggerValue: number;
  status: IncidentState;
  triggeredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}
