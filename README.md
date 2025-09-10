# Sample Application

This repository contains a minimal Flask application exposed via a `/healthcheck` endpoint. Dependencies are managed with [Poetry](https://python-poetry.org/) and the app is containerised with Docker for easy local development and deployment.

## Local development

1. Copy `.env.example` to `.env` and update environment variables as needed.
2. Start the application:

```bash
docker compose up
```

## Testing

Run the unit tests inside the Docker environment:

```bash
docker compose run app poetry run pytest -s
```

## Deployment

1. Create (or confirm) an AWS ECR repository and authenticate Docker:

```bash
aws ecr create-repository --repository-name devops-test --region <region> || true
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
```

2. Build and push the Docker image:

```bash
docker build --platform linux/amd64 -t devops-test .
docker tag devops-test:latest <account>.dkr.ecr.<region>.amazonaws.com/devops-test:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/devops-test:latest
```

3. (Optional) Deploy infrastructure with AWS CDK:

```bash
cd iac
npx cdk deploy
```

## Infrastructure components

The CDK stack links the container image into existing AWS resources and creates the runtime environment:

- **Imports** an existing VPC, Application Load Balancer with HTTPS certificate, IAM task roles, and an ECR repository.
- **Creates** an ECS cluster and Fargate service that pulls the image tag from ECR.
- **Attaches** the service to the load balancer via an HTTPS listener with `/healthcheck` monitoring.

This workflow builds the application image, publishes it to ECR, and provisions the ECS service behind the load balancer.
