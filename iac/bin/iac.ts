#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { IacStack } from '../lib/iac-stack';

const app = new cdk.App();
new IacStack(app, 'IacStack', {
  env: { account: '827539266883', region: 'ap-southeast-1' },
});