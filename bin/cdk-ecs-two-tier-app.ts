#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkEcsTwoTierAppStack } from '../lib/cdk-ecs-two-tier-app-stack';

const app = new cdk.App();
new CdkEcsTwoTierAppStack(app, 'CdkEcsTwoTierAppStack');
