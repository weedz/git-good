import { Component, Fragment } from "preact";
import { cssDefaultValues, getSavedCSSVariable, setCSSVariable } from "../../../Data/styles";

export class UISettings extends Component {
    render() {
        return (
            <Fragment>
                <div>
                    <label>
                        <p>Background color:</p>
                        <input type="color" value={getSavedCSSVariable("--background-color")} onInput={e => {
                            setCSSVariable("--background-color", e.currentTarget.value);
                            this.forceUpdate();
                        }} />
                        <button type="button" onClick={_ => {
                            setCSSVariable("--background-color", cssDefaultValues["--background-color"]);
                            this.forceUpdate();
                        }}>Reset</button>
                    </label>
                </div>
                <div>
                    <label>
                        <p>Border color:</p>
                        <input type="color" value={getSavedCSSVariable("--border-color")} onInput={e => {
                            setCSSVariable("--border-color", e.currentTarget.value);
                            this.forceUpdate();
                        }} />
                        <button type="button" onClick={_ => {
                            setCSSVariable("--border-color", cssDefaultValues["--border-color"]);
                            this.forceUpdate();
                        }}>Reset</button>
                    </label>
                </div>
                <div>
                    <label>
                        <p>Font:</p>
                        <input type="text" value={getSavedCSSVariable("--font")} onChange={e => {
                            setCSSVariable("--font", e.currentTarget.value);
                            this.forceUpdate();
                        }} />
                        <button type="button" onClick={_ => {
                            setCSSVariable("--font", cssDefaultValues["--font"]);
                            this.forceUpdate();
                        }}>Reset</button>
                    </label>
                </div>
                <div>
                    <label>
                        <p>Text color:</p>
                        <input type="color" value={getSavedCSSVariable("--text-color")} onInput={e => {
                            setCSSVariable("--text-color", e.currentTarget.value);
                            this.forceUpdate();
                        }} />
                        <button type="button" onClick={_ => {
                            setCSSVariable("--text-color", cssDefaultValues["--text-color"]);
                            this.forceUpdate();
                        }}>Reset</button>
                    </label>
                </div>
            </Fragment>
        )
    }
}
