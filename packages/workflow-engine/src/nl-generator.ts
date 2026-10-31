import { computeHierarchicalClusterLayout } from '@nexus/world-engine';
import { TwinEdge, TwinNode } from '@nexus/twin-graph';
import { GeneratedWorldResult, NLWorldPrompt } from './types.js';

export function generateWorldFromNL(promptData: NLWorldPrompt): GeneratedWorldResult {
  const prompt = promptData.prompt.toLowerCase();
  const rationale: string[] = [];

  // 1. Detect Environment Type
  let envType: 'cloud' | 'enterprise_datacenter' | 'scada_ics' | 'satellite_mesh' =
    promptData.preferredEnvironment || 'cloud';

  if (prompt.includes('scada') || prompt.includes('plc') || prompt.includes('industrial') || prompt.includes('grid')) {
    envType = 'scada_ics';
    rationale.push('Identified industrial control system (SCADA/ICS) infrastructure from prompt keywords.');
  } else if (prompt.includes('satellite') || prompt.includes('orbital') || prompt.includes('constellation') || prompt.includes('mesh')) {
    envType = 'satellite_mesh';
    rationale.push('Identified orbital satellite mesh network from space/satellite keywords.');
  } else if (prompt.includes('datacenter') || prompt.includes('enterprise') || prompt.includes('on-prem') || prompt.includes('active directory')) {
    envType = 'enterprise_datacenter';
    rationale.push('Identified enterprise datacenter topology with corporate directory infrastructure.');
  } else {
    rationale.push('Constructed modern cloud microservice architecture.');
  }

  // 2. Synthesize Nodes based on detected architecture
  const rawNodes: TwinNode[] = [];
  const rawEdges: TwinEdge[] = [];

  // Extract explicit CVE mentions if present
  const cveMatches = promptData.prompt.match(/CVE-\d{4}-\d{4,7}/gi) || [];

  if (envType === 'scada_ics') {
    rawNodes.push(
      {
        id: 'scada-gateway-01',
        name: 'SCADA Demilitarized Gateway',
        type: 'firewall',
        tier: 0,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '192.168.1.1' }
      },
      {
        id: 'hmi-workstation-01',
        name: 'HMI Workstation Console (Human-Machine Interface)',
        type: 'server',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '192.168.2.10', vulnerabilities: cveMatches.length > 0 ? cveMatches : ['CVE-2023-3595'] }
      },
      {
        id: 'plc-controller-alpha',
        name: 'Primary PLC Centrifuge Controller',
        type: 'iot_sensor',
        tier: 4,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '192.168.3.5' }
      },
      {
        id: 'historian-db-01',
        name: 'SCADA Process Historian Vault',
        type: 'database',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '192.168.2.50' }
      }
    );

    rawEdges.push(
      {
        id: 'edge-gw-hmi',
        source: 'scada-gateway-01',
        target: 'hmi-workstation-01',
        protocol: 'TLS',
        trafficRateKbps: 500,
        isEncrypted: true,
        status: 'normal'
      },
      {
        id: 'edge-hmi-plc',
        source: 'hmi-workstation-01',
        target: 'plc-controller-alpha',
        protocol: 'INTERNAL_BUS',
        trafficRateKbps: 200,
        isEncrypted: false,
        status: 'normal'
      },
      {
        id: 'edge-hmi-historian',
        source: 'hmi-workstation-01',
        target: 'historian-db-01',
        protocol: 'TCP',
        trafficRateKbps: 350,
        isEncrypted: true,
        status: 'normal'
      }
    );
  } else if (envType === 'satellite_mesh') {
    rawNodes.push(
      {
        id: 'ground-station-relay',
        name: 'Earth Ground Station Uplink',
        type: 'cloud_gateway',
        tier: 0,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.50.0.1' }
      },
      {
        id: 'sat-leo-alpha',
        name: 'LEO Satellite Node Alpha',
        type: 'router',
        tier: 1,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.50.1.1' }
      },
      {
        id: 'sat-leo-beta',
        name: 'LEO Satellite Node Beta',
        type: 'server',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.50.1.2', vulnerabilities: cveMatches }
      },
      {
        id: 'telemetry-vault',
        name: 'Orbital Telemetry Storage',
        type: 'database',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.50.2.1' }
      }
    );

    rawEdges.push(
      {
        id: 'edge-uplink',
        source: 'ground-station-relay',
        target: 'sat-leo-alpha',
        protocol: 'TLS',
        trafficRateKbps: 1000,
        isEncrypted: true,
        status: 'normal'
      },
      {
        id: 'edge-isl-laser',
        source: 'sat-leo-alpha',
        target: 'sat-leo-beta',
        protocol: 'GRPC',
        trafficRateKbps: 5000,
        isEncrypted: true,
        status: 'normal'
      },
      {
        id: 'edge-sat-telemetry',
        source: 'sat-leo-beta',
        target: 'telemetry-vault',
        protocol: 'INTERNAL_BUS',
        trafficRateKbps: 600,
        isEncrypted: true,
        status: 'normal'
      }
    );
  } else {
    // Default: Cloud Microservices / Enterprise Cluster
    rawNodes.push(
      {
        id: 'ingress-waf-01',
        name: 'Cloud Ingress WAF',
        type: 'firewall',
        tier: 0,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.0.0.1' }
      },
      {
        id: 'api-gateway-01',
        name: 'Kong API Gateway',
        type: 'load_balancer',
        tier: 1,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.0.1.1' }
      },
      {
        id: 'auth-service-pod',
        name: 'OAuth Identity Service',
        type: 'server',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.0.2.10', vulnerabilities: cveMatches.length > 0 ? cveMatches : ['CVE-2024-21413'] }
      },
      {
        id: 'billing-service-pod',
        name: 'Transaction Microservice',
        type: 'server',
        tier: 2,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.0.2.11' }
      },
      {
        id: 'redis-cache-cluster',
        name: 'Session Redis Cache',
        type: 'database',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.0.3.5' }
      },
      {
        id: 'postgres-primary-vault',
        name: 'Production PostgreSQL Vault',
        type: 'database',
        tier: 3,
        status: 'healthy',
        position: { x: 0, y: 0, z: 0 },
        metadata: { ipAddress: '10.0.3.10' }
      }
    );

    rawEdges.push(
      {
        id: 'edge-waf-gw',
        source: 'ingress-waf-01',
        target: 'api-gateway-01',
        protocol: 'TLS',
        trafficRateKbps: 2000,
        isEncrypted: true,
        status: 'normal'
      },
      {
        id: 'edge-gw-auth',
        source: 'api-gateway-01',
        target: 'auth-service-pod',
        protocol: 'GRPC',
        trafficRateKbps: 800,
        isEncrypted: true,
        status: 'normal'
      },
      {
        id: 'edge-gw-billing',
        source: 'api-gateway-01',
        target: 'billing-service-pod',
        protocol: 'GRPC',
        trafficRateKbps: 600,
        isEncrypted: true,
        status: 'normal'
      },
      {
        id: 'edge-auth-redis',
        source: 'auth-service-pod',
        target: 'redis-cache-cluster',
        protocol: 'TCP',
        trafficRateKbps: 1200,
        isEncrypted: false,
        status: 'normal'
      },
      {
        id: 'edge-billing-db',
        source: 'billing-service-pod',
        target: 'postgres-primary-vault',
        protocol: 'TCP',
        trafficRateKbps: 450,
        isEncrypted: true,
        status: 'normal'
      }
    );
  }

  // 3. Compute optimal 3D spatial layout using hierarchical cluster layout
  const positionedNodes = computeHierarchicalClusterLayout(rawNodes, rawEdges);
  rationale.push(`Calculated 3D spatial coordinates across ${positionedNodes.length} nodes and ${rawEdges.length} network links.`);

  const titleWords = promptData.prompt.slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const worldName = titleWords.length > 5
    ? titleWords.charAt(0).toUpperCase() + titleWords.slice(1)
    : `Generated ${envType.toUpperCase()} World`;

  return {
    name: worldName,
    description: `Digital Twin synthesized from natural language: "${promptData.prompt}"`,
    environmentType: envType,
    nodes: positionedNodes,
    edges: rawEdges,
    rationale
  };
}
