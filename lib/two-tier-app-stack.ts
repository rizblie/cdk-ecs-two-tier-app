import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as sd from '@aws-cdk/aws-servicediscovery';
import * as logs from '@aws-cdk/aws-logs';
import { RemovalPolicy } from '@aws-cdk/core';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { Peer } from '@aws-cdk/aws-ec2';


interface TwoTierAppStackProps extends cdk.StackProps {
  cluster: ecs.ICluster;
  vpc: ec2.IVpc;
}

export class TwoTierAppStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: TwoTierAppStackProps) {
    super(scope, id, props);

    // Service discovery namespace
    const namespace = new sd.PrivateDnsNamespace(this, 'DemoNamespace', {
      name: "twotierapp.local",
      vpc: props.vpc
    });

    // Ingress security group
    const ingressSG = new ec2.SecurityGroup(this, 'IngressSG', {
      vpc: props.vpc
    });
    ingressSG.addIngressRule(Peer.anyIpv4(), ec2.Port.tcp(22));


    // Log group

    const logGroup = new logs.LogGroup(this, 'DemoLogGroup', {
      logGroupName: "twotierapp",
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_WEEK
    });

    // Task defs
    const backendTaskDef = new ecs.FargateTaskDefinition(this, 'BackendTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512
    });
    new ecs.ContainerDefinition(this, 'BackendContainer', {
      image: ecs.ContainerImage.fromRegistry("wizriz/hello-backend"),
      taskDefinition: backendTaskDef,
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "backend-",
        logGroup: logGroup
      })
    });

    const frontendTaskDef = new ecs.FargateTaskDefinition(this, 'WebTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512
    });
    new ecs.ContainerDefinition(this, 'FrontendContainer', {
      image: ecs.ContainerImage.fromRegistry("wizriz/hello-web"),
      taskDefinition: frontendTaskDef,
      command: [
        "--backend", "http://backend.twotierapp.local/data"
      ],
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "frontend-",
        logGroup: logGroup
      })
    });

    // Services
    const backendService = new ecs.FargateService(this, 'BackendService', {
      cluster: props.cluster,
      taskDefinition: backendTaskDef,
      desiredCount: 2,
      cloudMapOptions: {
        cloudMapNamespace: namespace,
        name: "backend"
      }
    });
    const frontendService = new ecs.FargateService(this, 'FrontendService', {
      cluster: props.cluster,
      taskDefinition: frontendTaskDef,
      desiredCount: 2,
      cloudMapOptions: {
        cloudMapNamespace: namespace,
        name: "frontend"
      }
    });

    // Connect security groups
    backendService.connections.allowFrom(
      frontendService, ec2.Port.tcp(80)
    );
    frontendService.connections.allowFrom(
      ingressSG, ec2.Port.tcp(80)
    )
  }
}
