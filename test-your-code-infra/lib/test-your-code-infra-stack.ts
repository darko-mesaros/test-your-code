import * as cdk from '@aws-cdk/core';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as iam from '@aws-cdk/aws-iam';

export class TestYourCodeInfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // ROLES AND PERMS
    const codeBuildRole = new iam.Role(this, 'deployRole',{
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });
    codeBuildRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

    // CodeCommitRepo
    const repo = new codecommit.Repository(this, 'codecommit', {
      repositoryName: 'testing-your-code',
      description: 'For the love of PROD, test your code',
    });

    // CodePipeline
    const pipeline = new codepipeline.Pipeline(this, 'thePipe',{
      pipelineName: 'testing-your-code-cicd',
    });

    // Source action
    const sourceOutput = new codepipeline.Artifact();

    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'codecommit',
      repository: repo,
      branch: 'main',
      output: sourceOutput
    });

    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    // CodeBuild - Build
    const buildOutput = new codepipeline.Artifact();

    const buildProject = new codebuild.PipelineProject(this, 'unitBuild',{
      buildSpec: codebuild.BuildSpec.fromSourceFilename('build-test.yml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
      }
    });
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'build',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });
    
    pipeline.addStage({
      stageName: 'Build',
      actions: [buildAction],
    });

    // CodeBuild - Integ
    const integOutput = new codepipeline.Artifact();

    const integProject = new codebuild.PipelineProject(this, 'integBuild',{
      buildSpec: codebuild.BuildSpec.fromSourceFilename('integ-test.yml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true,
      }
    });
    const integAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'integ',
      project: integProject,
      input: sourceOutput,
      outputs: [integOutput],
    });
    
    pipeline.addStage({
      stageName: 'Integ',
      actions: [integAction],
    });

    // CodeBuild - Deploy
    const deployOutput = new codepipeline.Artifact();
    const deployProject = new codebuild.PipelineProject(this, 'deployBuild',{
      buildSpec: codebuild.BuildSpec.fromSourceFilename('build-deploy.yml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
      },
      role: codeBuildRole,
    });
    const deployAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'unit-deploy',
      project: deployProject,
      input: integOutput,
      outputs: [deployOutput],
    });
    
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [deployAction],
    });
  }
}

