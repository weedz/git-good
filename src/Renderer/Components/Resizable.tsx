import type { JSX } from "preact";
import { setCSSVariable } from "../Data/styles.js";
import { debounce } from "../utils.js";

const debouncedResize = debounce((e: MouseEvent) => {
    const newWidth = Math.max(200, Math.min(500, e.clientX)).toString();
    setCSSVariable("--branch-list-width", `${newWidth}px`);
}, 20);

function handleMouseUp() {
    window.removeEventListener("mousemove", debouncedResize);
    window.removeEventListener("mouseup", handleMouseUp);
}

interface ResizableProps {
    children: JSX.Element;
}

export function Resizable(props: ResizableProps) {
    return (
        <div class="resizable-wrapper">
            {props.children}
            <div class="resizable-track"
                onMouseDown={_ => {
                    window.addEventListener("mousemove", debouncedResize);
                    window.addEventListener("mouseup", handleMouseUp);
                }} />
        </div>
    );
}
