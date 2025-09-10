# Infrastructure as Code

This directory contains an AWS CDK stack that wires the container image into an ECS Fargate service.

## Stack overview

The `IacStack` defined in `lib/iac-stack.ts` performs the following:

- Imports existing networking and security resources defined in `lib/config.ts`, including a VPC, public subnets, IAM roles, an Application Load Balancer, and an ACM certificate.
- Creates an ECS cluster and Fargate task definition that pulls the application image from ECR.
- Provisions a Fargate service and registers it behind the ALB via an HTTPS listener with `/healthcheck` monitoring.

## Useful commands

- `npm run build` – compile TypeScript to JavaScript
- `npm run watch` – watch for changes and compile
- `npm run test` – run Jest unit tests
- `npx cdk synth` – emit the CloudFormation template
- `npx cdk diff` – compare stack state
- `npx cdk deploy` – deploy the stack to the configured account/region
