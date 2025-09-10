import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';

import { config, ENV_STAGE } from './config';

type StageName = keyof typeof config;

export class IacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Ensure ENV_STAGE is a valid key of config, fallback to 'dev'
    const stage: StageName = (ENV_STAGE in config ? ENV_STAGE : 'dev') as StageName;
    const stageConfig = config[stage];

    // Import existing VPC
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: stageConfig.vpcId });

    // Import existing ALB and Listener
    const alb = elbv2.ApplicationLoadBalancer.fromLookup(this, 'ALB', { loadBalancerArn: stageConfig.albArn });

    // Import existing ACM certificate
    const certificate = certificatemanager.Certificate.fromCertificateArn(this, 'Cert', stageConfig.certificateArn);

    // Import ECR Repository
    const ecrRepo = cdk.aws_ecr.Repository.fromRepositoryName(this, 'AppEcrRepo', stageConfig.ecrRepoName);

    const taskRole = iam.Role.fromRoleArn(this, 'TaskRole', stageConfig.taskRoleArn);
    const executionRole = iam.Role.fromRoleArn(this, 'ExecutionRole', stageConfig.executionRoleArn);

    const cluster = new ecs.Cluster(this, 'AppCluster', {
      vpc,
      clusterName: 'MyAppCluster',
    });

    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
      executionRole,
    });

    const container = taskDef.addContainer('AppContainer', {
      image: ecs.ContainerImage.fromEcrRepository(ecrRepo, 'latest'),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'App' }),
      portMappings: [{ containerPort: 3000 }],
      command: ['bash', '-c', 'ls -al && /bin/bash run.sh'],
      environment: {
        APP_ENV: ENV_STAGE,
      },
    });

    // Import public subnets
    const publicSubnets = stageConfig.publicSubnetIds.map((subnetId, idx) =>
      ec2.Subnet.fromSubnetId(this, `PublicSubnet${idx + 1}`, subnetId)
    );

    const service = new ecs.FargateService(this, 'AppService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: {
        subnets: publicSubnets,
      },
      deploymentController: {
        type: ecs.DeploymentControllerType.ECS,
      },
      circuitBreaker: { rollback: true },
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
    });

    const httpsListener = alb.addListener('HttpsListener', {
      port: 443,
      open: true,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [certificate],
    });

    httpsListener.addTargets('AppECS', {
      port: 3000,
      targets: [service],
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck: {
        path: '/healthcheck',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(5),
        timeout: cdk.Duration.seconds(2),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
      },
    });
  }
}