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

    // Determine deployment stage; default to 'dev' when ENV_STAGE is unset
    const deploymentStage: StageName = (ENV_STAGE in config ? ENV_STAGE : 'dev') as StageName;
    const stageConfig = config[deploymentStage];

    // Import existing networking and security resources
    const importedVpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: stageConfig.vpcId });
    const importedAlb = elbv2.ApplicationLoadBalancer.fromLookup(this, 'ALB', {
      loadBalancerArn: stageConfig.albArn,
    });
    const importedCertificate = certificatemanager.Certificate.fromCertificateArn(
      this,
      'Cert',
      stageConfig.certificateArn,
    );

    // Reference existing ECR repository and IAM roles
    const appRepository = cdk.aws_ecr.Repository.fromRepositoryName(this, 'AppEcrRepo', stageConfig.ecrRepoName);
    const taskRole = iam.Role.fromRoleArn(this, 'TaskRole', stageConfig.taskRoleArn);
    const executionRole = iam.Role.fromRoleArn(this, 'ExecutionRole', stageConfig.executionRoleArn);

    // Define an ECS cluster within the imported VPC
    const cluster = new ecs.Cluster(this, 'AppCluster', {
      vpc: importedVpc,
      clusterName: 'MyAppCluster',
    });

    // Task definition for the application container
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
      executionRole,
    });

    // Determine container image tag and container configuration
    const containerImageTag = process.env.IMAGE_TAG ?? 'latest';
    const appContainer = taskDefinition.addContainer('AppContainer', {
      image: ecs.ContainerImage.fromEcrRepository(appRepository, containerImageTag),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'App' }),
      portMappings: [{ containerPort: 3000 }],
      command: ['bash', '-c', 'ls -al && /bin/bash run.sh'],
      environment: {
        APP_ENV: ENV_STAGE,
      },
    });

    // Map public subnet IDs to Subnet objects
    const publicSubnetRefs = stageConfig.publicSubnetIds.map((subnetId, idx) =>
      ec2.Subnet.fromSubnetId(this, `PublicSubnet${idx + 1}`, subnetId),
    );

    // ECS Fargate service to run the application
    const service = new ecs.FargateService(this, 'AppService', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: {
        subnets: publicSubnetRefs,
      },
      deploymentController: {
        type: ecs.DeploymentControllerType.ECS,
      },
      circuitBreaker: { rollback: true },
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
    });

    // HTTPS listener on the existing ALB
    const httpsListener = importedAlb.addListener('HttpsListener', {
      port: 443,
      open: true,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [importedCertificate],
    });

    // Forward HTTPS traffic to the ECS service and configure health checks
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