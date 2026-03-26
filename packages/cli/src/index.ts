#!/usr/bin/env node

import { Command } from "commander"
import { createCommand } from "./commands/create.js"

const program = new Command()
  .name("mono-cli")
  .description("Mono Workspace CLI tool")
  .version("0.0.0", "-v, --version")

program.addCommand(createCommand)
program.parse()
