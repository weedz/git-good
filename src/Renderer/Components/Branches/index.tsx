import { Fragment, h } from "preact";
import { Locks, type BranchesObj } from "../../../Common/Actions";
import { PureStoreComponent, Store, lockChanged, type StoreType } from "../../Data/store";
import BranchList from "./BranchList";
import StashList from "./StashList";
import { filterBranches, getBranchTree } from "./Utils";
import "./style.css";

type State = {
    filter: string
    branches: null | ReturnType<typeof getBranchTree>;
}

function branchesToTree(branches: BranchesObj, filter: string | null) {
    return getBranchTree(
        filter
            ? filterBranches(
                branches,
                (value) => value.normalizedName.toLocaleLowerCase().includes(filter)
            )
            : branches
    );
}

class Branches extends PureStoreComponent<unknown, State> {
    componentDidMount() {
        this.listen("branches", this.loadBranches);
        this.listen("heads", (_) => this.loadBranches(Store.branches));
        if (Store.branches) {
            this.loadBranches(Store.branches);
        }
    }

    loadBranches = async (branches: StoreType["branches"]) => {
        if (!branches) {
            return this.setState({branches});
        }
        // Renders branches without upstream "graph" (ahead/behind)
        this.setState({
            branches: branchesToTree(branches, this.state.filter),
        });
    }

    filter = (e: h.JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
        if (Store.branches && e.currentTarget.value !== this.state.filter) {
            const filterValue = e.currentTarget.value.toLocaleLowerCase();
            this.setState({
                branches: branchesToTree(Store.branches, filterValue),
                filter: filterValue
            });
        }
    }

    render() {
        if (!this.state.branches) {
            return <p>Loading...</p>
        }

        return (
            <Fragment>
                <div style="flex: 1; overflow: auto" class="pane">
                    <BranchList branches={this.state.branches} />
                    <hr />
                    <StashList />
                </div>
                <div class="pane flex-column">
                    <input style="flex: 1" type="text" placeholder="Filter..." onKeyUp={this.filter} />
                </div>
            </Fragment>
        );
    }
}

export default class BranchesWrapper extends PureStoreComponent {
    componentDidMount(): void {
        this.listen("locks", locks => {
            if (lockChanged(Locks.BRANCH_LIST, locks)) {
                this.forceUpdate();
            }
        });
    }
    render() {
        return (
            <div id="branch-pane" class={`flex-column${Store.locks[Locks.BRANCH_LIST] ? " disabled" : ""}`}>
                <Branches />
            </div>
        );
    }
}
