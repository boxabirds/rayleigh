// Test data: Known post hierarchy for #rayleighintegrationtest1
export const TEST_TAG = 'rayleighintegrationtest1';

export const KNOWN_POSTS = {
  // Parent posts
  parents: [
    '3lcvgo7r7w22p',  // Parent 1 (original)
    '3lcyctkrfi22u',  // Parent 2
    '3lcycts5yrc2u',  // Parent 3
    '3lcycuehwrc2u',  // Parent 4
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

// Base URI for all test posts
export const BASE_URI = 'at://did:plc:lasy2wsk6shhobbfm5ujhisn/app.bsky.feed.post';

// Helper to create full URIs
export function getPostUri(postId: string): string {
  return `${BASE_URI}/${postId}`;
}
