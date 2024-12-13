// Test data: Known post hierarchy for #rayleighintegrationtest1
export const TEST_TAG = 'rayleighintegrationtest1';

export const KNOWN_POSTS = {
  // Parent posts
  parents: [
    '3lcycuehwrc2u',  // Parent 4
    '3lcycts5yrc2u',  // Parent 3
    '3lcyctkrfi22u',  // Parent 2
    '3lcvgo7r7w22p',  // Parent 1 (original)
  ],
  // Child posts under Parent 1
  children: [
    {
      id: '3lcvgow535c2p',
      children: [
        {
          id: '3lcvgpofbz22p',
          children: [{ id: '3lcvgpy5zt22p', children: [] }]
        },
        { id: '3lcvgsyosnc2w', children: [] }
      ]
    },
    {
      id: '3lcvgpa2cj22p',
      children: [{ id: '3lcvgqb72ts2p', children: [] }]
    },
    { id: '3lcvgqitl2s2p', children: [] }
  ]
};

// Helper function to flatten the hierarchy
export function getAllPostIds(node: { id: string, children: any[] }): string[] {
  const ids = [node.id];
  for (const child of node.children) {
    ids.push(...getAllPostIds(child));
  }
  return ids;
}

// Base URIs for test posts (we have posts from two different DIDs)
const NEW_DID = 'at://did:plc:x4ggsw6n63rbissb7h7xlheq/app.bsky.feed.post';
const OLD_DID = 'at://did:plc:lasy2wsk6shhobbfm5ujhisn/app.bsky.feed.post';

// Helper to create full URIs - handle posts from different DIDs
export function getPostUri(postId: string): string {
  // First three parent posts are from the new DID
  if (postId === '3lcycuehwrc2u' || postId === '3lcycts5yrc2u' || postId === '3lcyctkrfi22u') {
    return `${NEW_DID}/${postId}`;
  }
  // All other posts are from the old DID
  return `${OLD_DID}/${postId}`;
}
