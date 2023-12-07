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
                this.runCommand(this.state.commands[this.state.selectedIdx]);
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
    selectItem(idx: number) {
        if (idx !== this.state.selectedIdx) {
            this.setState({ selectedIdx: idx }, this.scrollSelectedItemIntoView);
        }
    }
    scrollSelectedItemIntoView = () => {
        if (this.commandListRef.current) {
            const child = this.commandListRef.current.children.item(this.state.selectedIdx);
            if (child) {
                child.scrollIntoView({block: "nearest"});
            }
        }
    }
    async runCommand(command: CommandPalette.Command) {
        const newCommands = await command.action();
        if (newCommands) {
            if (this.filterRef.current) {
                this.filterRef.current.value = "";
            }
            this.setState({
                allCommands: newCommands,
                commands: newCommands,
                selectedIdx: 0,
            });
        } else {
            this.setState(defaultState);
        }
    }
    filterCommands = (e: h.JSX.TargetedInputEvent<HTMLInputElement>) => {
        const filterValue = e.currentTarget.value.toLowerCase();
        const commands = this.state.allCommands.filter(command => command.label.toLowerCase().includes(filterValue) || command.details?.toLowerCase().includes(filterValue));
        this.setState({
            commands,
            selectedIdx: 0,
        });
    }
    handleClick = (e: h.JSX.TargetedMouseEvent<HTMLElement>) => {
        const dataIdx = e.currentTarget.dataset["idx"];
        if (!dataIdx) {
            return;
        }
        const idx = Number.parseInt(dataIdx, 10);
        if (this.state.commands[idx]) {
            this.runCommand(this.state.commands[idx]);
        }
    }
    render() {
        if (!this.state.isOpen) {
            return null;
        }

        return (
            <div class="command-palette">
                <input ref={this.filterRef} type="text" onInput={this.filterCommands} />
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
