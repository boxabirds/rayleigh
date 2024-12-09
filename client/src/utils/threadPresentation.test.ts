import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildThreadPresentation, loadThread } from './threadPresentation';
import { PostView, ThreadViewPost } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import { BskyAgent } from '@atproto/api';

describe('threadPresentation', () => {
  const createMockPost = (text: string, createdAt: string): PostView => ({
    uri: `at://fake/${text}`,
    cid: text,
    author: {
      did: 'did:plc:fake',
      handle: 'test.bsky.social',
      displayName: 'Test User',
    },
    record: {
      text: text,
      createdAt: createdAt,
      $type: 'app.bsky.feed.post',
    },
    indexedAt: createdAt,
  });

  const createMockThread = (post: PostView, replies?: ThreadViewPost[]): ThreadViewPost => ({
    post,
    replies,
  });

  describe('buildThreadPresentation', () => {
    it('should correctly structure a thread with no replies', () => {
      const parentPost = createMockPost('parent', '2024-12-09T10:00:00Z');
      const thread = createMockThread(parentPost);

      const result = buildThreadPresentation(thread);

      expect(result.parentPost).toBe(parentPost);
      expect(result.directChildren).toHaveLength(0);
    });

    it('should correctly structure a thread with direct replies in chronological order', () => {
      const parentPost = createMockPost('parent', '2024-12-09T10:00:00Z');
      const reply2 = createMockPost('reply2', '2024-12-09T10:02:00Z');
      const reply1 = createMockPost('reply1', '2024-12-09T10:01:00Z');
      const reply3 = createMockPost('reply3', '2024-12-09T10:03:00Z');

      const thread = createMockThread(parentPost, [
        createMockThread(reply2),
        createMockThread(reply1),
        createMockThread(reply3),
      ]);

      const result = buildThreadPresentation(thread);

      expect(result.parentPost).toBe(parentPost);
      expect(result.directChildren).toHaveLength(3);
      // Should be sorted by creation time (oldest first)
      expect(result.directChildren[0].post).toBe(reply1);
      expect(result.directChildren[1].post).toBe(reply2);
      expect(result.directChildren[2].post).toBe(reply3);
      // No first children sequences
      expect(result.directChildren[0].firstChildrenSequence).toHaveLength(0);
      expect(result.directChildren[1].firstChildrenSequence).toHaveLength(0);
      expect(result.directChildren[2].firstChildrenSequence).toHaveLength(0);
    });

    it('should follow only first child paths', () => {
      const parentPost = createMockPost('parent', '2024-12-09T10:00:00Z');
      const reply1 = createMockPost('reply1', '2024-12-09T10:01:00Z');
      const reply1_1 = createMockPost('reply1.1', '2024-12-09T10:02:00Z');
      const reply1_1_1 = createMockPost('reply1.1.1', '2024-12-09T10:03:00Z');
      const reply1_2 = createMockPost('reply1.2', '2024-12-09T10:04:00Z');
      const reply2 = createMockPost('reply2', '2024-12-09T10:05:00Z');
      const reply2_1 = createMockPost('reply2.1', '2024-12-09T10:06:00Z');

      const thread = createMockThread(parentPost, [
        createMockThread(reply1, [
          createMockThread(reply1_1, [
            createMockThread(reply1_1_1),
          ]),
          createMockThread(reply1_2),
        ]),
        createMockThread(reply2, [
          createMockThread(reply2_1),
        ]),
      ]);

      const result = buildThreadPresentation(thread);

      expect(result.parentPost).toBe(parentPost);
      expect(result.directChildren).toHaveLength(2);
      
      // First direct child and its sequence
      expect(result.directChildren[0].post).toBe(reply1);
      expect(result.directChildren[0].firstChildrenSequence).toHaveLength(2);
      expect(result.directChildren[0].firstChildrenSequence[0]).toBe(reply1_1);
      expect(result.directChildren[0].firstChildrenSequence[1]).toBe(reply1_1_1);
      
      // Second direct child and its sequence
      expect(result.directChildren[1].post).toBe(reply2);
      expect(result.directChildren[1].firstChildrenSequence).toHaveLength(1);
      expect(result.directChildren[1].firstChildrenSequence[0]).toBe(reply2_1);
    });

    it('should handle multiple independent paths', () => {
      const parentPost = createMockPost('parent', '2024-12-09T10:00:00Z');
      const reply1 = createMockPost('reply1', '2024-12-09T10:01:00Z');
      const reply2 = createMockPost('reply2', '2024-12-09T10:02:00Z');
      const reply3 = createMockPost('reply3', '2024-12-09T10:03:00Z');
      const reply1_1 = createMockPost('reply1.1', '2024-12-09T10:04:00Z');
      const reply2_1 = createMockPost('reply2.1', '2024-12-09T10:05:00Z');

      const thread = createMockThread(parentPost, [
        createMockThread(reply1, [
          createMockThread(reply1_1),
        ]),
        createMockThread(reply2, [
          createMockThread(reply2_1),
        ]),
        createMockThread(reply3),
      ]);

      const result = buildThreadPresentation(thread);

      expect(result.parentPost).toBe(parentPost);
      expect(result.directChildren).toHaveLength(3);
      
      // Check each direct child and its sequence
      expect(result.directChildren[0].post).toBe(reply1);
      expect(result.directChildren[0].firstChildrenSequence).toHaveLength(1);
      expect(result.directChildren[0].firstChildrenSequence[0]).toBe(reply1_1);
      
      expect(result.directChildren[1].post).toBe(reply2);
      expect(result.directChildren[1].firstChildrenSequence).toHaveLength(1);
      expect(result.directChildren[1].firstChildrenSequence[0]).toBe(reply2_1);
      
      expect(result.directChildren[2].post).toBe(reply3);
      expect(result.directChildren[2].firstChildrenSequence).toHaveLength(0);
    });
  });

  describe('loadThread', () => {
    let mockAgent: { getPostThread: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockAgent = {
        getPostThread: vi.fn(),
      };
    });

    it('should handle at:// URI format', async () => {
      const uri = 'at://did:plc:abc/app.bsky.feed.post/123';
      const mockThread = createMockThread(createMockPost('test', '2024-12-09T10:00:00Z'));
      
      mockAgent.getPostThread.mockResolvedValue({
        success: true,
        data: { thread: mockThread },
      });

      const result = await loadThread(mockAgent as unknown as BskyAgent, uri);
      
      expect(mockAgent.getPostThread).toHaveBeenCalledWith({
        uri,
        depth: 1,
        parentHeight: 1,
      });
      expect(result).toBeDefined();
    });

    it('should handle did:plc: URI format', async () => {
      const uri = 'did:plc:abc/app.bsky.feed.post/123';
      const mockThread = createMockThread(createMockPost('test', '2024-12-09T10:00:00Z'));
      
      mockAgent.getPostThread.mockResolvedValue({
        success: true,
        data: { thread: mockThread },
      });

      const result = await loadThread(mockAgent as unknown as BskyAgent, uri);
      
      expect(mockAgent.getPostThread).toHaveBeenCalledWith({
        uri: `at://${uri}`,
        depth: 1,
        parentHeight: 1,
      });
      expect(result).toBeDefined();
    });

    it('should handle invalid URI format', async () => {
      const uri = 'invalid-uri';
      
      await expect(loadThread(mockAgent as unknown as BskyAgent, uri)).rejects.toThrow('Invalid URI format');
      expect(mockAgent.getPostThread).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const uri = 'at://did:plc:abc/app.bsky.feed.post/123';
      
      mockAgent.getPostThread.mockRejectedValue(new Error('API Error'));

      await expect(loadThread(mockAgent as unknown as BskyAgent, uri)).rejects.toThrow('API Error');
    });

    it('should handle a reply post and show parent with immediate children and their first-child sequences', async () => {
      // Create a mock thread structure:
      // Parent
      // ├── Child1
      // │   ├── Child1.1
      // │   │   └── Child1.1.1
      // └── Child2
      //     ├── Child2.1
      //     │   └── Child2.1.1

      // Mock implementation for recursive fetching
      mockAgent.getPostThread.mockImplementation((params: { uri: string }) => {
        switch (params.uri) {
          case 'at://child1':
            return Promise.resolve({
              success: true,
              data: {
                thread: {
                  post: {
                    uri: 'at://child1',
                    record: {
                      text: 'Child 1',
                      reply: {
                        parent: { uri: 'at://parent' }
                      }
                    }
                  }
                }
              }
            });

          case 'at://parent':
            return Promise.resolve({
              success: true,
              data: {
                thread: {
                  post: {
                    uri: 'at://parent',
                    record: { text: 'Parent' }
                  },
                  replies: [
                    {
                      post: {
                        uri: 'at://child1',
                        record: { text: 'Child 1' }
                      },
                      replies: [
                        {
                          post: {
                            uri: 'at://child1.1',
                            record: { text: 'Child 1.1' }
                          }
                        }
                      ]
                    },
                    {
                      post: {
                        uri: 'at://child2',
                        record: { text: 'Child 2' }
                      },
                      replies: [
                        {
                          post: {
                            uri: 'at://child2.1',
                            record: { text: 'Child 2.1' }
                          }
                        }
                      ]
                    }
                  ]
                }
              }
            });

          case 'at://child1.1':
            return Promise.resolve({
              success: true,
              data: {
                thread: {
                  post: {
                    uri: 'at://child1.1',
                    record: { text: 'Child 1.1' }
                  },
                  replies: [
                    {
                      post: {
                        uri: 'at://child1.1.1',
                        record: { text: 'Child 1.1.1' }
                      }
                    }
                  ]
                }
              }
            });

          case 'at://child1.1.1':
            return Promise.resolve({
              success: true,
              data: {
                thread: {
                  post: {
                    uri: 'at://child1.1.1',
                    record: { text: 'Child 1.1.1' }
                  },
                  replies: []
                }
              }
            });

          case 'at://child2.1':
            return Promise.resolve({
              success: true,
              data: {
                thread: {
                  post: {
                    uri: 'at://child2.1',
                    record: { text: 'Child 2.1' }
                  },
                  replies: [
                    {
                      post: {
                        uri: 'at://child2.1.1',
                        record: { text: 'Child 2.1.1' }
                      }
                    }
                  ]
                }
              }
            });

          case 'at://child2.1.1':
            return Promise.resolve({
              success: true,
              data: {
                thread: {
                  post: {
                    uri: 'at://child2.1.1',
                    record: { text: 'Child 2.1.1' }
                  },
                  replies: []
                }
              }
            });

          default:
            return Promise.reject(new Error(`Unexpected URI: ${params.uri}`));
        }
      });

      const result = await loadThread(mockAgent as unknown as BskyAgent, 'at://child1');

      expect(result).toBeDefined();
      expect(result?.parentPost.uri).toBe('at://parent');
      expect(result?.directChildren).toHaveLength(2);

      // Verify first child and its first-child sequence
      expect(result?.directChildren[0].post.uri).toBe('at://child1');
      expect(result?.directChildren[0].firstChildrenSequence).toHaveLength(2);
      expect(result?.directChildren[0].firstChildrenSequence[0].uri).toBe('at://child1.1');
      expect(result?.directChildren[0].firstChildrenSequence[1].uri).toBe('at://child1.1.1');

      // Verify second child and its first-child sequence
      expect(result?.directChildren[1].post.uri).toBe('at://child2');
      expect(result?.directChildren[1].firstChildrenSequence).toHaveLength(2);
      expect(result?.directChildren[1].firstChildrenSequence[0].uri).toBe('at://child2.1');
      expect(result?.directChildren[1].firstChildrenSequence[1].uri).toBe('at://child2.1.1');
    });

    it('should handle recursive fetching of first-child sequences', async () => {
      // Initial reply post fetch
      const mockReplyThread = {
        success: true,
        data: {
          thread: {
            post: {
              uri: 'at://child1',
              record: {
                text: 'Child 1',
                reply: {
                  parent: { uri: 'at://parent' }
                }
              },
              indexedAt: '2023-01-01T00:00:01Z'
            }
          }
        }
      };

      // Parent post fetch with immediate children
      const mockParentThread = {
        success: true,
        data: {
          thread: {
            post: {
              uri: 'at://parent',
              record: { text: 'Parent' },
              indexedAt: '2023-01-01T00:00:00Z'
            },
            replies: [
              {
                post: {
                  uri: 'at://child1',
                  record: { text: 'Child 1' },
                  indexedAt: '2023-01-01T00:00:01Z'
                },
                replies: [
                  {
                    post: {
                      uri: 'at://child1.1',
                      record: { text: 'Child 1.1' }
                    }
                  }
                ]
              },
              {
                post: {
                  uri: 'at://child2',
                  record: { text: 'Child 2' },
                  indexedAt: '2023-01-01T00:00:02Z'
                },
                replies: [
                  {
                    post: {
                      uri: 'at://child2.1',
                      record: { text: 'Child 2.1' }
                    }
                  }
                ]
              }
            ]
          }
        }
      };

      // Child1.1 fetch
      const mockChild1_1Thread = {
        success: true,
        data: {
          thread: {
            post: {
              uri: 'at://child1.1',
              record: { text: 'Child 1.1' },
              indexedAt: '2023-01-01T00:00:03Z'
            },
            replies: [
              {
                post: {
                  uri: 'at://child1.1.1',
                  record: { text: 'Child 1.1.1' }
                }
              }
            ]
          }
        }
      };

      // Child1.1.1 fetch (no replies)
      const mockChild1_1_1Thread = {
        success: true,
        data: {
          thread: {
            post: {
              uri: 'at://child1.1.1',
              record: { text: 'Child 1.1.1' },
              indexedAt: '2023-01-01T00:00:04Z'
            },
            replies: []
          }
        }
      };

      // Child2.1 fetch
      const mockChild2_1Thread = {
        success: true,
        data: {
          thread: {
            post: {
              uri: 'at://child2.1',
              record: { text: 'Child 2.1' },
              indexedAt: '2023-01-01T00:00:05Z'
            },
            replies: [
              {
                post: {
                  uri: 'at://child2.1.1',
                  record: { text: 'Child 2.1.1' }
                }
              }
            ]
          }
        }
      };

      // Child2.1.1 fetch (no replies)
      const mockChild2_1_1Thread = {
        success: true,
        data: {
          thread: {
            post: {
              uri: 'at://child2.1.1',
              record: { text: 'Child 2.1.1' },
              indexedAt: '2023-01-01T00:00:06Z'
            },
            replies: []
          }
        }
      };

      // Mock the sequence of API calls
      mockAgent.getPostThread.mockImplementation((params: { uri: string }) => {
        switch (params.uri) {
          case 'at://child1':
            return Promise.resolve({
              success: true,
              data: {
                thread: {
                  post: {
                    uri: 'at://child1',
                    record: {
                      text: 'Child 1',
                      reply: {
                        parent: { uri: 'at://parent' }
                      }
                    },
                    indexedAt: '2023-01-01T00:00:01Z'
                  }
                }
              }
            });

          case 'at://parent':
            return Promise.resolve({
              success: true,
              data: {
                thread: {
                  post: {
                    uri: 'at://parent',
                    record: { text: 'Parent' },
                    indexedAt: '2023-01-01T00:00:00Z'
                  },
                  replies: [
                    {
                      post: {
                        uri: 'at://child1',
                        record: { text: 'Child 1' },
                        indexedAt: '2023-01-01T00:00:01Z'
                      },
                      replies: [
                        {
                          post: {
                            uri: 'at://child1.1',
                            record: { text: 'Child 1.1' }
                          }
                        }
                      ]
                    },
                    {
                      post: {
                        uri: 'at://child2',
                        record: { text: 'Child 2' },
                        indexedAt: '2023-01-01T00:00:02Z'
                      },
                      replies: [
                        {
                          post: {
                            uri: 'at://child2.1',
                            record: { text: 'Child 2.1' }
                          }
                        }
                      ]
                    }
                  ]
                }
              }
            });

          case 'at://child1.1':
            return Promise.resolve({
              success: true,
              data: {
                thread: {
                  post: {
                    uri: 'at://child1.1',
                    record: { text: 'Child 1.1' },
                    indexedAt: '2023-01-01T00:00:03Z'
                  },
                  replies: [
                    {
                      post: {
                        uri: 'at://child1.1.1',
                        record: { text: 'Child 1.1.1' }
                      }
                    }
                  ]
                }
              }
            });

          case 'at://child1.1.1':
            return Promise.resolve({
              success: true,
              data: {
                thread: {
                  post: {
                    uri: 'at://child1.1.1',
                    record: { text: 'Child 1.1.1' },
                    indexedAt: '2023-01-01T00:00:04Z'
                  },
                  replies: []
                }
              }
            });

          case 'at://child2.1':
            return Promise.resolve({
              success: true,
              data: {
                thread: {
                  post: {
                    uri: 'at://child2.1',
                    record: { text: 'Child 2.1' },
                    indexedAt: '2023-01-01T00:00:05Z'
                  },
                  replies: [
                    {
                      post: {
                        uri: 'at://child2.1.1',
                        record: { text: 'Child 2.1.1' }
                      }
                    }
                  ]
                }
              }
            });

          case 'at://child2.1.1':
            return Promise.resolve({
              success: true,
              data: {
                thread: {
                  post: {
                    uri: 'at://child2.1.1',
                    record: { text: 'Child 2.1.1' },
                    indexedAt: '2023-01-01T00:00:06Z'
                  },
                  replies: []
                }
              }
            });

          default:
            return Promise.reject(new Error(`Unexpected URI: ${params.uri}`));
        }
      });

      const result = await loadThread(mockAgent as unknown as BskyAgent, 'at://child1');

      expect(result).toBeDefined();
      expect(result?.parentPost.uri).toBe('at://parent');
      expect(result?.directChildren).toHaveLength(2);

      // Verify first child and its first-child sequence
      expect(result?.directChildren[0].post.uri).toBe('at://child1');
      expect(result?.directChildren[0].firstChildrenSequence).toHaveLength(2);
      expect(result?.directChildren[0].firstChildrenSequence[0].uri).toBe('at://child1.1');
      expect(result?.directChildren[0].firstChildrenSequence[1].uri).toBe('at://child1.1.1');

      // Verify second child and its first-child sequence
      expect(result?.directChildren[1].post.uri).toBe('at://child2');
      expect(result?.directChildren[1].firstChildrenSequence).toHaveLength(2);
      expect(result?.directChildren[1].firstChildrenSequence[0].uri).toBe('at://child2.1');
      expect(result?.directChildren[1].firstChildrenSequence[1].uri).toBe('at://child2.1.1');

      // Verify API calls
      expect(mockAgent.getPostThread).toHaveBeenCalledWith(expect.objectContaining({ uri: 'at://child1' }));
      expect(mockAgent.getPostThread).toHaveBeenCalledWith(expect.objectContaining({ uri: 'at://parent' }));
      expect(mockAgent.getPostThread).toHaveBeenCalledWith(expect.objectContaining({ uri: 'at://child1.1' }));
      expect(mockAgent.getPostThread).toHaveBeenCalledWith(expect.objectContaining({ uri: 'at://child1.1.1' }));
      expect(mockAgent.getPostThread).toHaveBeenCalledWith(expect.objectContaining({ uri: 'at://child2.1' }));
      expect(mockAgent.getPostThread).toHaveBeenCalledWith(expect.objectContaining({ uri: 'at://child2.1.1' }));
    });
  });
});
