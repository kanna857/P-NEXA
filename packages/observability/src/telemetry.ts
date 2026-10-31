export interface MetricSample {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: Date;
}

export class TelemetryCollector {
  private metrics: MetricSample[] = [];

  public record(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: new Date()
    });

    if (this.metrics.length > 5000) {
      this.metrics.splice(0, 1000);
    }
  }

  public getRecent(count: number = 50): MetricSample[] {
    return this.metrics.slice(-count);
  }

  public getSystemSnapshot(): Record<string, unknown> {
    const mem = process.memoryUsage();
    return {
      uptimeSeconds: Math.floor(process.uptime()),
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100
    };
  }
}

export const telemetry = new TelemetryCollector();

