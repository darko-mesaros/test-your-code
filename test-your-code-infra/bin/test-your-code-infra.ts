#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { TestYourCodeInfraStack } from '../lib/test-your-code-infra-stack';

const app = new cdk.App();
new TestYourCodeInfraStack(app, 'TestYourCodeInfraStack');
