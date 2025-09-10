# Sample Application

## How to run

```bash
docker compose up
```

## How to test

```bash
docker compose run app poetry run pytest -s
```



aws ecr create-repository --repository-name devops-test --region ap-southeast-1 || true
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 827539266883.dkr.ecr.ap-southeast-1.amazonaws.com

docker build --platform linux/amd64 -t devops-test .
docker tag devops-test:latest 827539266883.dkr.ecr.ap-southeast-1.amazonaws.com/devops-test:latest
docker push 827539266883.dkr.ecr.ap-southeast-1.amazonaws.com/devops-test:latest


In the first time it will deploy


AZ must overlapse