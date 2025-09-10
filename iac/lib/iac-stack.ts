import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';

export class IacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpcId = 'vpc-08110f24efd134cae';
    const albArn = 'arn:aws:elasticloadbalancing:ap-southeast-1:827539266883:loadbalancer/app/devops-test/30749bda016cc2a2';
    const certificateArn = 'arn:aws:acm:ap-southeast-1:827539266883:certificate/f8f76683-31f8-41a3-8f44-18600a75262d';
    const taskRoleArn = 'arn:aws:iam::827539266883:role/devops-test-ecs-task-role';
    const executionRoleArn = 'arn:aws:iam::827539266883:role/devops-test-ecs-execution-role';

    // Create ECR Repository
    const ecrRepo = cdk.aws_ecr.Repository.fromRepositoryName(this, 'AppEcrRepo', 'devops-test');

    // Import existing VPC
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId });

    // Import existing ALB and Listener
    const alb = elbv2.ApplicationLoadBalancer.fromLookup(this, 'ALB', { loadBalancerArn: albArn });

    // Import existing ACM certificate
    const certificate = certificatemanager.Certificate.fromCertificateArn(this, 'Cert', certificateArn);

    const taskRole = iam.Role.fromRoleArn(this, 'TaskRole', taskRoleArn);
    const executionRole = iam.Role.fromRoleArn(this, 'ExecutionRole', executionRoleArn);

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
        APP_ENV: 'dev',
      },
    });

    const publicSubnets = ec2.Subnet.fromSubnetId(this, 'PublicSubnet1', 'subnet-0bbeea90fa964cf14');
    const publicSubnets2 = ec2.Subnet.fromSubnetId(this, 'PublicSubnet2', 'subnet-0223f701ff20176e2');

    const service = new ecs.FargateService(this, 'AppService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: {
        subnets: [publicSubnets, publicSubnets2],
      },
      deploymentController: {
        type: ecs.DeploymentControllerType.ECS,
      },
      circuitBreaker: { rollback: false },
      minHealthyPercent: 50,
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