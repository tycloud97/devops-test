// config.ts
// Centralized configuration for your CDK stack

export const ENV_STAGE = process.env.ENV_STAGE || 'dev';

export const config = {
    dev: {
        vpcId: 'vpc-08110f24efd134cae',
        certificateArn: 'arn:aws:acm:ap-southeast-1:827539266883:certificate/f8f76683-31f8-41a3-8f44-18600a75262d',
        albArn: 'arn:aws:elasticloadbalancing:ap-southeast-1:827539266883:loadbalancer/app/devops-test/30749bda016cc2a2',
        taskRoleArn: 'arn:aws:iam::827539266883:role/devops-test-ecs-task-role',
        executionRoleArn: 'arn:aws:iam::827539266883:role/devops-test-ecs-execution-role',
        ecrRepoName: 'devops-test',
        publicSubnetIds: ['subnet-0bbeea90fa964cf14', 'subnet-0223f701ff20176e2',
        ],
    },
    // Add more stages (e.g., prod) as needed
};