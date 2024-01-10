import { Component, createRef, h } from "preact";

import "./style.css";
import { commandPaletteCommandList } from "./commands";
import type * as CommandPalette from "./commands";

const defaultState: State = {
    isOpen: false,
    commands: commandPaletteCommandList,
    allCommands: commandPaletteCommandList,
    selectedIdx: 0,
}

interface State {
    isOpen: boolean;
    allCommands: CommandPalette.Command[];
    commands: CommandPalette.Command[];
    selectedIdx: number;
}
export class CommandPaletteContainer extends Component<unknown, State> {
    state: State = defaultState;
    filterRef = createRef<HTMLInputElement>();
    commandListRef = createRef<HTMLUListElement>();

    componentDidMount(): void {
        // Assumes we never unmount :+1:
        window.addEventListener("keydown", async e => {
            if (e.ctrlKey && e.shiftKey && e.code === "KeyP") {
                e.preventDefault();
                this.setState({ isOpen: true });
                this.selectItem(0, true);
                requestAnimationFrame(() => {
                    this.filterRef.current?.focus();
                });
                return;
            }
            if (!this.state.isOpen) {
                return;
            }

            // Navigate command list
            if (e.key === "ArrowDown") {
                e.preventDefault();
                this.selectItem(Math.min(this.state.commands.length - 1, this.state.selectedIdx + 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                this.selectItem(Math.max(0, this.state.selectedIdx - 1));
            }
            // else if (e.key === "End") {
            //     e.preventDefault();
            //     this.selectItem(this.state.commands.length - 1);
            // } else if (e.key === "Home") {
            //     e.preventDefault();
            //     this.selectItem(0);
            // }
            else if (e.key === "PageDown") {
                e.preventDefault();
                this.selectItem(Math.min(this.state.commands.length - 1, this.state.selectedIdx + 10));
            } else if (e.key === "PageUp") {
                e.preventDefault();
                this.selectItem(Math.max(0, this.state.selectedIdx - 10));
            }
            // Execute selected command
            else if (e.key === "Enter") {
                e.preventDefault();
                this.tryRunCommand(this.state.selectedIdx);
            }
            // Close command list
            else if (e.key === "Escape") {
                e.preventDefault();
                if (this.state.isOpen) {
                    this.setState(defaultState);
                }
            }
        });
    }
    selectItem(idx: number, alwaysRunAction = false) {
        if (idx < 0 || idx > this.state.commands.length - 1) {
            return;
        }
        const idxIsDifference = idx !== this.state.selectedIdx;
        if (alwaysRunAction || idxIsDifference) {
            const focusAction = this.state.commands[idx].focusAction;
            if (focusAction) {
                focusAction();
            }
        }
        if (idxIsDifference) {
            this.setState({ selectedIdx: idx }, this.scrollSelectedItemIntoView);
        }
    }
    scrollSelectedItemIntoView = () => {
        if (this.commandListRef.current) {
            const child = this.commandListRef.current.children.item(this.state.selectedIdx);
            if (child) {
                child.scrollIntoView({ block: "nearest" });
            }
        }
    }
    tryRunCommand(idx: number) {
        if (this.state.commands[idx]) {
            this.runCommand(this.state.commands[idx]);
        }
    }
    async runCommand(command: CommandPalette.Command) {
        const result = await command.action();
        if (result === undefined) {
            this.setState(defaultState);
        }
        else if (Array.isArray(result)) {
            if (this.filterRef.current) {
                this.filterRef.current.value = "";
            }
            this.setState({
                allCommands: result,
                commands: result,
                selectedIdx: 0,
            }, () => {
                this.selectItem(this.state.selectedIdx, true);
            });
        } else if (result === true) {
            const commands = this.state.allCommands;
            commands.splice(commands.indexOf(command) >>> 0, 1);
            // TODO: Close command palette if `commands.length === 0`?
            this.setState({
                commands,
                allCommands: commands,
                selectedIdx: Math.min(commands.length - 1, this.state.selectedIdx),
            }, () => {
                this.selectItem(this.state.selectedIdx, true);
            });
            if (this.filterRef.current?.value) {
                this.filterCommands(commands, this.filterRef.current.value.toLowerCase());
            }
        }
    }
    filterCommands(allCommands: CommandPalette.Command[], filterValue: string) {
        const commands = filterValue.length > 0
            ? allCommands.filter(command => command.label.toLowerCase().includes(filterValue) || command.details?.toLowerCase().includes(filterValue))
            : allCommands;
        this.setState({
            commands,
            selectedIdx: 0,
        });
    }
    handleFilterInput = (e: h.JSX.TargetedInputEvent<HTMLInputElement>) => {
        this.filterCommands(this.state.allCommands, e.currentTarget.value.toLowerCase());
    }
    handleClick = (e: h.JSX.TargetedMouseEvent<HTMLElement>) => {
        const dataIdx = e.currentTarget.dataset["idx"];
        if (!dataIdx) {
            return;
        }
        const idx = Number.parseInt(dataIdx, 10);
        this.tryRunCommand(idx);
    }
    render() {
        if (!this.state.isOpen) {
            return null;
        }

        return (
            <div class="command-palette">
                <input ref={this.filterRef} type="text" onInput={this.handleFilterInput} />
                <ul class="commands" ref={this.commandListRef}>
                    {this.state.commands.map((command, idx) => (
                        <li key={idx} data-idx={idx} onClick={this.handleClick} class={idx === this.state.selectedIdx ? "selected" : ""} title={command.details}>
                            {command.label}
                            {command.details && <small>{command.details}</small>}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
}
