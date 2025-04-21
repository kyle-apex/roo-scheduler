<div align="center">
  <img src="assets/icons/scheduler-icon.svg" alt="Roo Scheduler Icon" width="100" />
</div>

<div align="center">
<h1>Roo Scheduler</h1>

<a href="https://marketplace.visualstudio.com/items?itemName=RooVeterinaryInc.roo-scheduler" target="_blank"><img src="https://img.shields.io/badge/Download%20on%20VS%20Marketplace-blue?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="Download on VS Marketplace"></a>

</div>

**Roo Scheduler** is a task scheduling extension for VS Code that seamlessly integrates with Roo Code. It allows you to automate recurring tasks and workflows directly within your development environment.  

This extension was created from a fork of Roo Code and designed using similar patterns/components to act as a functional community proof of concept and make it easier to merge if folks might want such a feature in Roo Code itself.

Models used:
- AI Coding: Sonnet 3.7 and GPT4.1 (~$20 total in initial release)
- The rest of this README: Sonnet 3.7
- Logo SVG: ChatGPT (free)

## Key Features

### Flexible Task Scheduling

- **Time-Based Scheduling**: Schedule tasks to run at specific intervals (minutes, hours, days)
- **Day Selection**: Configure tasks to run only on specific days of the week
- **Start & Expiration Dates**: Set when tasks should begin and automatically expire
- **Activity-Based Execution**: Optionally run tasks only when there's been user activity since the last execution

### Task Interaction Options

- **Wait Mode**: Wait for a specified period of inactivity before executing a scheduled task
- **Interrupt Mode**: Automatically interrupt any running task to execute the scheduled task
- **Skip Mode**: Skip execution if another task is already running

### Seamless Roo Code Integration

Roo Scheduler connects directly with Roo Code to:

- Start new tasks in any available Roo Code mode
- Pass custom instructions to Roo Code for each scheduled task
- Provides options to execute after specified inactivity, interrupt existing tasks, or skip execution of a schedule

## Use Cases

- **Automated Code Reviews**: Schedule regular code quality checks
- **Documentation Updates**: Keep documentation in sync with code changes
- **Dependency Checks**: Regularly verify and update project dependencies
- **Codebase Analysis**: Run periodic analysis to identify optimization opportunities
- **Custom Workflows**: Automate any repetitive development task with natural language instructions

## License

[Apache 2.0 © 2025 Roo Scheduler, Inc.](./LICENSE)
