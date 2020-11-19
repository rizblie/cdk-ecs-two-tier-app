#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { EcsClusterStack } from '../lib/ecs-cluster-stack';
import { TwoTierAppStack } from '../lib/two-tier-app-stack';

const app = new cdk.App();
const ecsClusterStack = new EcsClusterStack(app, 'EcsClusterStack');

new TwoTierAppStack(app, 'TwoTierAppStack', {
    cluster: ecsClusterStack.cluster,
    vpc: ecsClusterStack.vpc
});
