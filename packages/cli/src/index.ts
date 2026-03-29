#!/usr/bin/env node

import { Command } from "commander"
import { addCommand } from "./commands/add.js"
import { createCommand } from "./commands/create.js"
import { initCommand } from "./commands/init.js"

const program = new Command()
  .name("loom-cli")
  .description("Loom Workspace CLI tool")
  .version("0.0.0", "-v, --version")

program.addCommand(createCommand)
program.addCommand(initCommand)
program.addCommand(addCommand)
program.parse()
