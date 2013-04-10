#!/usr/bin/perl

use strict;
use MIME::Base64;
use Socket;
use FileHandle;

# [Post an entry]
# parameters(post):
# action: "post_entry"
# status: status
# keyword: keyword
# source: source
# in_reply_to_status_id: in_reply_to_status_id
# file: image(Base64 encoded)
#   w   = 2 bytes: width
#   h   = 2 bytes: height
#   bci = 1 bytes: bytes of a color index
#   noc = {bci} byte(s): number of colors
#         3 bytes * {noc}: colors(RGB)
#         {bci} byte(s) * w * h: color index at each pixels
#
# [Delete a entry]
# parameters(post):
# action: "delete_entry"
# id: status id
#
# [Add a star]
# parameters(post):
# action: "addstar"
# id: status id
#
# [Common]
# cookie:
# user: hatena-id
# passwd: api-passwd
#
# response (json)
# {
#   status: 200/401/404/500/504
# }

sub trim {
  my ($s) = @_;
  $s =~ s/^\s+//;
  $s =~ s/\s+$//;
  $s;
}

sub parse_values {
  my ($d, $s) = @_;
  my %r = ();
  foreach (split($d, $s)) {
    my ($n, $v) = split('=', $_);
    $r{trim($n)} = trim($v);
  }
  %r;
}

sub parse_url_encoded_parameter {
  my ($s) = @_;
  parse_values('&', $s);
}

sub parse_request_body {
  my $data;
  read(STDIN, $data, $ENV{'CONTENT_LENGTH'});
  parse_url_encoded_parameter($data);
}

sub make_request_body {
  my ($vars) = @_;
  my $s = '';
  my $first = 1;
  while (my ($n, $v) = each(%$vars)) {
    $s .= '&' unless $first;
    $s .= $n . '=' . $v;
    $first = 0;
  }
  $s;
}

sub make_basic_authorization_header {
  my ($user, $passwd) = @_;
  'Authorization: Basic ' . encode_base64($user . ':' . $passwd, '');
}

sub get_tcp_socket {
  my $s;
  socket($s, PF_INET, SOCK_STREAM, getprotobyname('tcp')) && $s;
}

sub socket_connect_to {
  my ($s, $host, $port) = @_;
  my ($ip);
  $ip = inet_aton($host);
  return 0 unless $ip;
  connect($s, pack_sockaddr_in($port, $ip));
}

use constant HTTP_OK => 200;
use constant HTTP_BAD_REQUEST => 400;
use constant HTTP_UNAUTHORIZED => 401;
use constant HTTP_NOT_FOUND => 404;
use constant HTTP_PROXY_ERROR => 504;
use constant HTTP_INTERNAL_ERROR => 500;

sub http_request {
  my ($socket, $method, $path, $header, $body) = @_;
  $path = '/' unless defined($path);
  $header = [] unless defined($header);
  $body = '' unless defined($body);
  print $socket "$method $path HTTP/1.1\r\n";
  foreach (@$header) {
    print $socket $_, "\r\n";
  }
  print $socket 'Content-Length: ', length($body), "\r\n";
  print $socket "\r\n";
  print $socket $body;
}

sub exit_with_result {
  my ($status) = @_;
  print 'Status: ', $status, "\r\n";
  print 'Content-Type: text/html; charset=utf-8', "\n\n";
  exit;
}

use constant TIMEOUT_SECONDS => 10;

my $HOST = {
  'ja' => 'h.hatena.ne.jp',
  'en' => 'h.hatena.com'
};
use constant PORT => 80;
use constant POST_ENTRY_PATH => '/api/statuses/update.json';

sub make_addstar_path {
  my ($id) = @_;
  '/api/favorites/create/' . $id . '.json';
}

sub make_delete_entry_path {
  my ($id) = @_;
  '/api/statuses/destroy/' . $id . '.json';
}

sub make_default_post_header {
  my ($language, $user, $passwd) = @_;
  my $user_agent = $ENV{'HTTP_USER_AGENT'} || 'Mini-Haiku Post Proxy';
  ('Host: ' . $$HOST{$language},
   'User-Agent: ' . $user_agent,
   make_basic_authorization_header($user, $passwd));
}

sub post_request {
  my ($language, $path, $header, $body) = @_;
  my $socket = get_tcp_socket();
  return HTTP_INTERNAL_ERROR unless $socket;
  binmode($socket);
  autoflush $socket 1;
  local $SIG{'ALRM'} = sub {
    close($socket);
    exit_with_result(HTTP_PROXY_ERROR);
  };
  alarm(TIMEOUT_SECONDS);
  return HTTP_PROXY_ERROR unless socket_connect_to($socket, $$HOST{$language}, PORT);
  http_request($socket, 'POST', $path, $header, $body);
  my (undef, $status) = split(' ', <$socket>);
  alarm(0);
  close($socket);
  return HTTP_UNAUTHORIZED if $status == HTTP_UNAUTHORIZED;
  return HTTP_NOT_FOUND if $status == HTTP_NOT_FOUND;
  unless ($status eq HTTP_OK) {
    print STDERR 'Hatena responded ', $status, "\n";
    return HTTP_PROXY_ERROR;
  }
  HTTP_OK;
}

sub assert_request_parameter {
  my ($params, $name) = @_;
  unless (exists($$params{$name})) {
    print STDERR 'Parameter ', $name, ' is not sent', "\n";
    exit_with_result(HTTP_BAD_REQUEST);
  }
}

sub get_request_parameter {
  my ($params, $name) = @_;
  assert_request_parameter($params, $name);
  $$params{$name};
}

sub extract_request_parameters {
  my ($params, $names) = @_;
  my %res = ();
  foreach (@$names) {
    $res{$_} = get_request_parameter($params, $_);
  }
  %res;
}

sub addstar {
  my ($language, $post, $user, $passwd) = @_;
  my $id = get_request_parameter($post, 'id');
  my @header = make_default_post_header($language, $user, $passwd);
  exit_with_result(post_request($language, make_addstar_path($id), \@header));
}

sub post_entry {
  my ($language, $post, $user, $passwd) = @_;
  my %params = extract_request_parameters($post, ['status', 'keyword', 'source']);
  my $in_reply_to_status_id = $$post{'in_reply_to_status_id'};
  $params{'in_reply_to_status_id'} = $in_reply_to_status_id if defined($in_reply_to_status_id);
  my $file = $$post{'file'};
  my @header = make_default_post_header($language, $user, $passwd);
  if ($file) {
  } else {
    my $body = make_request_body(\%params);
    push(@header, 'Content-Type: application/x-www-form-urlencoded');
    exit_with_result(post_request($language, POST_ENTRY_PATH, \@header, $body));
  }
}

sub delete_entry {
  my ($language, $post, $user, $passwd) = @_;
  my $id = get_request_parameter($post, 'id');
  my @header = make_default_post_header($language, $user, $passwd);
  exit_with_result(post_request($language, make_delete_entry_path($id), \@header));
}

my %query = parse_url_encoded_parameter($ENV{'QUERY_STRING'});
my %post = parse_request_body();
my %cookie = parse_values(';', $ENV{'HTTP_COOKIE'});
my $action = $query{'action'};
my $language = $query{'l'} || 'ja';
$language = 'ja' unless (exists($$HOST{$language}));
exit_with_result(HTTP_UNAUTHORIZED) if (!exists($cookie{'user'}) || !exists($cookie{'passwd'}));
my $user = $cookie{'user'};
my $passwd = $cookie{'passwd'};
if ($action eq 'addstar') {
  addstar($language, \%post, $user, $passwd);
} elsif ($action eq 'post_entry') {
  post_entry($language, \%post, $user, $passwd);
} elsif ($action eq 'delete_entry') {
  delete_entry($language, \%post, $user, $passwd);
} else {
  exit_with_result(HTTP_BAD_REQUEST);
}
