## Architecture

```mermaid
flowchart TB
  user[User / Client] -->|HTTPS 443| alb[Existing Application Load Balancer]

  subgraph vpc[Existing VPC]
    alb -->|Listener 443 (ACM Cert)| tg[Target Group -> HTTP 3000]

    subgraph public[Public Subnets (Imported)]
      tg --> svc[ECS Fargate Service\nDesiredCount=1, Public IP]
      svc --> task[Task Definition\nCPU: 256, Mem: 512\nAppContainer: Flask :3000]
      task --> logs[CloudWatch Logs]
    end
  end

  task -->|Pull image| ecr[(Existing ECR Repository)]
  task -->|Task/Exec| iam[(Existing IAM Roles)]
```

Notes:
- Pre-existing resources: VPC, Public Subnets, ALB, ACM Certificate, IAM Roles, ECR.
- Provisioned via CDK: ECS Cluster, Task Definition, Fargate Service, ALB HTTPS Listener + Target Group.

