/** @param {NS} ns */
export async function main(ns) {
    ns.ui.setTailTitle("Hacknet");
    ns.ui.openTail();
    ns.disableLog("ALL");
    ns.clearLog();

    const theme = ns.ui.getTheme();

    const upgrades = {
        level: "level",
        ram: "ram",
        cores: "cores"
    }

    let timer = null;

    let options = {
        autoSell: false,
        autoUpgrade: false
    }

    ns.atExit(() => {
        if (timer) {
            clearInterval(timer);
        }
    })

    function sellAll() {
        let op = `Sell for Money`;
        let hashes = ns.hacknet.numHashes();
        let cost = ns.hacknet.hashCost(op);
        if (hashes >= cost) {
            let count = Math.floor(hashes / cost);
            ns.hacknet.spendHashes(op, '', count);
        }
    }

    function processHacknet() {
        if (options.autoSell) {
            sellAll();
        }

        if (options.autoUpgrade) {
            for (let i = 0; i < ns.hacknet.numNodes(); i++) {
                let best = bestUpgrade(i);
                if (best == upgrades.level) {
                    ns.hacknet.upgradeLevel(i);
                } else if (best == upgrades.ram) {
                    ns.hacknet.upgradeRam(i);
                } else if (best == upgrades.cores) {
                    ns.hacknet.upgradeCore(i);
                }
            }
        }
    }

    function bestUpgrade(id) {
        const current = ns.hacknet.getNodeStats(id);
        const costLevel = ns.hacknet.getLevelUpgradeCost(id);
        const costRam = ns.hacknet.getRamUpgradeCost(id);
        const costCore = ns.hacknet.getCoreUpgradeCost(id);
        let resultLevel = 0;
        let resultRam = 0;
        let resultCore = 0;

        if (costLevel > 0 && costLevel < Number.POSITIVE_INFINITY) {
            let checkLevel = ns.formulas.hacknetServers.hashGainRate(current.level + 1, current.ramUsed, current.ram, current.cores);
            resultLevel = (checkLevel - current.production) / costLevel;
        }
        if (costRam > 0 && costRam < Number.POSITIVE_INFINITY) {
            let checkRam = ns.formulas.hacknetServers.hashGainRate(current.level, current.ramUsed, current.ram * 2, current.cores);
            resultRam = (checkRam - current.production) / costRam;
        }
        if (costCore > 0 && costCore < Number.POSITIVE_INFINITY) {
            let checkCore = ns.formulas.hacknetServers.hashGainRate(current.level, current.ramUsed, current.ram, current.cores + 1);
            resultCore = (checkCore - current.production) / costCore;
        }

        if (resultLevel >= resultRam && resultLevel >= resultCore) {
            return upgrades.level;
        }
        if (resultRam >= resultLevel && resultRam >= resultCore) {
            return upgrades.ram;
        }
        if (resultCore >= resultLevel && resultCore >= resultRam) {
            return upgrades.cores;
        }

        return undefined;
    }

    ns.printRaw(<HacknetTable />);

    function HacknetTable() {
        const [hashCount, setHashCount] = React.useState(ns.hacknet.numHashes());

        React.useEffect(() => {
            timer = setInterval(() => {
                setHashCount(ns.hacknet.numHashes());

                processHacknet();
            }, 100);
            return () => clearInterval(timer);
        }, []);

        return (
            <div>
                <HacknetOptions />
                <div>
                    <label>Hashes: {ns.format.number(hashCount, 2)}/{ns.format.number(ns.hacknet.hashCapacity())}</label>
                </div>
                <table style={{ width: "100%" }}>
                    <HacknetHeader />
                    <HacknetBody />
                </table>
            </div>
        )
    }

    function HacknetOptions() {
        function handleChange(e) {
            const target = e.target
            const value = target.checked;
            const name = target.name;
            options[name] = value;
        }

        return (
            <div style={{ position: "sticky", top: "-2px", left: "1px", width: "calc(100% - 2px)", backgroundColor: theme.backgroundsecondary }}>
                <label>
                    <input type={`checkbox`} name={`autoSell`} checked={options.autoSell} onChange={handleChange} />
                    Sell
                </label>
                <label>
                    <input type={`checkbox`} name={`autoUpgrade`} checked={options.autoUpgrade} onChange={handleChange} />
                    Upgrade
                </label>
            </div>
        );
    }

    function HacknetHeader() {
        const columns = [`ID`, `Prod`, `Cap`, `Level`, `RAM`, `Cores`];

        return (
            <thead>
                <tr>
                    {columns.map((col) => (
                        <th>
                            <label>{col}</label>
                        </th>
                    ))}
                </tr>
            </thead>
        )
    }

    function HacknetBody() {
        let nets = [];
        for (let i = 0; i < ns.hacknet.numNodes(); i++) {
            nets.push(ns.hacknet.getNodeStats(i));
        }

        return (
            <tbody>
                {nets.map((net) => (
                    <tr>
                        <td>{net.name}</td>
                        <td>{ns.format.number(net.production, 3)}</td>
                        <td>{net.hashCapacity}</td>
                        <td>{net.level}</td>
                        <td>{net.ram}</td>
                        <td>{net.cores}</td>
                    </tr>
                ))}
            </tbody>
        )
    }

    return new Promise(() => { });
}
