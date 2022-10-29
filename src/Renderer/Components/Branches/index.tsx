import { h, Fragment } from "preact";
import "./style.css";
import { BranchesObj, Locks } from "../../../Common/Actions";
import { Store, PureStoreComponent, StoreType, lockChanged } from "../../Data/store";
import { getBranchTree, filterBranches } from "./Utils";
import BranchList from "./BranchList";
import StashList from "./StashList";

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

export default class Branches extends PureStoreComponent<unknown, State> {
    componentDidMount() {
        this.listen("locks", locks => {
            if (lockChanged(Locks.BRANCH_LIST, locks)) {
                this.forceUpdate();
            }
        });
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
                <div id="branch-pane" class={`pane${Store.locks[Locks.BRANCH_LIST] ? " disabled" : ""}`}>
                    <BranchList branches={this.state.branches} />
                    <hr />
                    <StashList />
                </div>
                <div class="pane">
                    <input type="text" placeholder="Filter..." onKeyUp={this.filter} />
                </div>
            </Fragment>
        );
    }
}
