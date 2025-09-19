const hre = require("hardhat");

async function main() {
    console.log("Starting deployment...");
    
    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    // Check deployer balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

    try {
        // Deploy PrivacyIAM contract
        console.log("Deploying PrivacyIAM contract...");
        const PrivacyIAM = await hre.ethers.getContractFactory("PrivacyIAM");
        const privacyIAM = await PrivacyIAM.deploy();
        await privacyIAM.waitForDeployment();
        
        const privacyIAMAddress = await privacyIAM.getAddress();
        console.log("PrivacyIAM deployed to:", privacyIAMAddress);

        // Deploy MetaverseRegistry contract
        console.log("Deploying MetaverseRegistry contract...");
        const MetaverseRegistry = await hre.ethers.getContractFactory("MetaverseRegistry");
        const metaverseRegistry = await MetaverseRegistry.deploy(privacyIAMAddress);
        await metaverseRegistry.waitForDeployment();
        
        const metaverseRegistryAddress = await metaverseRegistry.getAddress();
        console.log("MetaverseRegistry deployed to:", metaverseRegistryAddress);

        // Save deployment info
        const deploymentInfo = {
            network: hre.network.name,
            PrivacyIAM: privacyIAMAddress,
            MetaverseRegistry: metaverseRegistryAddress,
            deployer: deployer.address,
            timestamp: new Date().toISOString()
        };

        console.log("\n=== Deployment Summary ===");
        console.log(JSON.stringify(deploymentInfo, null, 2));

        // Verify contracts on Etherscan if not local
        if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
            console.log("\nWaiting for block confirmations...");
            await privacyIAM.deploymentTransaction().wait(6);
            await metaverseRegistry.deploymentTransaction().wait(6);

            console.log("Verifying contracts on Etherscan...");
            try {
                await hre.run("verify:verify", {
                    address: privacyIAMAddress,
                    constructorArguments: [],
                });
                console.log("PrivacyIAM verified!");

                await hre.run("verify:verify", {
                    address: metaverseRegistryAddress,
                    constructorArguments: [privacyIAMAddress],
                });
                console.log("MetaverseRegistry verified!");
            } catch (error) {
                console.log("Verification error:", error.message);
            }
        }

    } catch (error) {
        console.error("Deployment error:", error);
        process.exit(1);
    }
}

main()
    .then(() => {
        console.log("Deployment completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });