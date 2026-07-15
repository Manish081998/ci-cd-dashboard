export interface RepoInfo {
  full_name: string;
  description: string;
  visibility: string;
  default_branch: string;
  allow_auto_merge: boolean;
  open_issues_count: number;
  stargazers_count: number;
  html_url: string;
  pushed_at: string;
}

export interface Branch {
  name: string;
  commit: { sha: string; url: string };
  protected: boolean;
}

export interface PullRequest {
  number: number;
  title: string;
  state: string;
  html_url: string;
  head: { ref: string; sha: string };
  base: { ref: string };
  created_at: string;
  auto_merge: unknown;
  node_id: string;
  user: { login: string; avatar_url: string };
  merged?: boolean;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_commit: { message: string; author: { name: string } };
  head_branch: string;
}

export interface Commit {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string; date: string } };
  author: { login: string; avatar_url: string } | null;
}

export interface Protection {
  required_status_checks: { contexts: string[] } | null;
  required_pull_request_reviews: { required_approving_review_count: number } | null;
}

export interface UserRepo {
  full_name: string;
  html_url: string;
  clone_url: string;
  private: boolean;
}
