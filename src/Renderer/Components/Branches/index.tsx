import { h, Fragment } from "preact";
import "./style.css";
import { BranchesObj, Locks } from "../../../Common/Actions";
import { Store, PureStoreComponent } from "../../Data/store";
import { getBranchTree, filterBranches } from "./Utils";
import BranchList from "./BranchList";
import { loadUpstreams } from "../../Data";
import StashList from "./StashList";

type State = {
    filter: string
    branches: ReturnType<typeof getBranchTree>;
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
            if (Store.locks[Locks.BRANCH_LIST] !== locks[Locks.BRANCH_LIST]) {
                this.forceUpdate();
            }
        });
        this.listen("branches", async branches => {
            this.loadBranches(branches);
        });
        if (Store.branches) {
            this.loadBranches(Store.branches);
        }
    }

    async loadBranches(branches: BranchesObj) {
        // Renders branches without upstream "graph" (ahead/behind)
        this.setState({
            branches: branchesToTree(branches, this.state.filter),
        });

        await loadUpstreams();
        this.setState({
            branches: branchesToTree(branches, this.state.filter),
        });
    }

    filter = (e: h.JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
        if (e.currentTarget.value !== this.state.filter) {
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
                <div id="branch-pane" className={`pane${Store.locks[Locks.BRANCH_LIST] ? " disabled" : ""}`}>
                    <BranchList branches={this.state.branches} />
                    <hr />
                    <StashList />
                </div>
                <div className="pane">
                    <input type="text" placeholder="Filter..." onKeyUp={this.filter} />
                </div>
            </Fragment>
        );
    }
}
