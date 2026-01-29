import { getContainerRuntimeClient, StartedNetwork } from "testcontainers";
import { inject } from "vitest";

export const getTestNetwork = async () => {
	const runtime = await getContainerRuntimeClient();
	const netId = inject("NETWORK_ID");
	const netName = inject("NETWORK_NAME");

	const rawNet = runtime.network.getById(netId);

	const network = new StartedNetwork(runtime, netName, rawNet);
	return network;
};
