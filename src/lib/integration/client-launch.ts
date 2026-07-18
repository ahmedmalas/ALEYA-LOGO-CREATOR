export function verifyClientLaunchParams(input: {
  return_url: string;
  business_id: string;
  workspace_id: string;
  state: string;
  exp: string;
  sig: string;
}) {
  return Boolean(
    input.return_url &&
      input.business_id &&
      input.workspace_id &&
      input.state &&
      input.exp &&
      input.sig,
  );
}
