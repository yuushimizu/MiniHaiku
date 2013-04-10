#!/usr/local/bin/ruby

$KCODE = 'utf-8'
require 'jcode'

module HTML
  class Element
    attr_reader :name
    attr_reader :attributes
    attr_reader :children
    def initialize(name, attributes = {}, children = nil)
      @name = name
      @attributes = attributes
      @children = children
    end
    def [](i)
      if i.is_a? Integer
        self.children ? self.children[i] : nil
      else
        self.attributes[i.to_s]
      end
    end
    def each_child_elements
      self.children && self.children.each {|c|
        yield c if c.is_a?(Element)
      }
    end
    def find_child(&cond)
      self.children && self.children.find(&cond)
    end
    def find_child_element
      self.find_child {|c| c.is_a?(Element) && yield(c)}
    end
    def find_child_by_name(name)
      self.find_child_element {|c| c.name == name}
    end
    def find_child_by_attribute(name, value)
      self.find_child_element {|c| c[name] == value}
    end
    def find_child_by_class(name)
      self.find_child_by_attribute('class', name)
    end
    def child_element_at(n)
      rest = n + 1
      self.find_child_element {|c|
        (rest -= 1) == 0
      }
    end
    def to_s
      result = '<' + self.name
      result << self.attributes.map {|elem| ' ' + elem[0] + '="' + elem[1] + '"'}.join
      if self.children
        result << '>'
        result << children.join
        result << '</' << self.name << '>'
      else
        result << ' />'
      end
      result
    end
  end

  def self.parse_attributes(s)
    regexp = /\".*?\"|[^\s\=]+|\=+/
    strip_quote = lambda{|value| (value =~ /\A\".*\"\Z/) ? value[1 ... -1] : value}
    attributes = {}
    last_name = nil
    assigning = false
    s.scan(regexp).each {|token|
      if last_name
        if assigning
          attributes[last_name] = strip_quote.call(token)
          assigning = false
          last_name = nil
        elsif token == '='
          assigning = true
        else
          attributes[last_name] = strip_quote.call(last_name)
          assigning = false
          last_name = strip_quote.call token
        end
      else
        last_name = strip_quote.call token
      end
    }
    attributes
  end

  def self.parse(s)
    regexp = /\<[\s]*(\/?)[\s]*([^\s\/\>]+)(.*?)(\/?)[\s]*\>/
    rest = s
    rec = proc {|parent_name|
      elements = []
      until rest.empty?
        if (match = regexp.match(rest))
          rest = match.post_match
          close_tag = !match[1].empty?
          name = match[2]
          attribute_string = match[3]
          has_children = (match[4] != '/') && name != 'embed' && name != 'param' && name != 'img'
          elements << match.pre_match unless match.pre_match.empty?
          if !close_tag
            elements << Element.new(name, parse_attributes(attribute_string), has_children ? rec.call(name) : nil)
          elsif name == parent_name
            break
          end
        else
          elements << rest
          rest = ''
        end
      end
      elements
    }
    rec.call nil
  end
end

require 'net/http'
require 'cgi'

def get_response(address, path, port = 80)
  Net::HTTP.start(address, port) {|h|
    h.get(path)
  }
end

def add_request_parameter(url, name, value)
  url + ((url.include? '?') ? '&' : '?') + name.to_s + '=' + value.to_s
end

def add_request_parameters(url, params)
  r = url
  params.each_pair {|name, value|
    r = add_request_parameter(r, name, value)
  }
  r
end

def make_path(cgi)
  if cgi.key? 'keyword'
    path = '/target.body?word=keyword:' + cgi['keyword']
  elsif cgi.key? 'user'
    path = '/' + cgi['user'] + '/.body'
  elsif cgi.key? 'following'
    path = '/' + cgi['following'] + '/following/.body'
  else
    path = '/.body'
  end
  additional = {}
  ['page', 'count'].each {|name|
    additional[name] = cgi[name] if cgi.key? name
  }
  add_request_parameters(path, additional)
end

Net::HTTP.version_1_2
cgi = CGI.new

case cgi.params['l'][0]
when 'en'
  $HOST_ROOT = 'h.hatena.com'
  $URL_ROOT = 'http://h.hatena.com'
  $HATENA_ROOT = 'http://www.hatena.com'
else
  $HOST_ROOT = 'h.hatena.ne.jp'
  $URL_ROOT = 'http://h.hatena.ne.jp'
  $HATENA_ROOT = 'http://www.hatena.ne.jp'
end

class User
  attr_accessor :id
  def name
    self.id
  end
  def screen_name
    self.id
  end
  def url
    self.id && ($URL_ROOT + '/' + self.id)
  end
  def profile_image_url
    self.id && ($HATENA_ROOT + '/users/' + self.id[0, 2] + '/' + self.id + '/profile.gif')
  end
end

class Status
  attr_accessor :id
  attr_accessor :keyword
  attr_accessor :text
  attr_accessor :user
  attr_accessor :in_reply_to_user_id
  attr_accessor :in_reply_to_status_id
  attr_accessor :created_at
  attr_accessor :source
  attr_accessor :replies
  def utc_created_at
    self.created_at && self.created_at.getutc.strftime('%Y-%m-%dT%H:%M:%SZ')
  end
  def link
    self.id && self.user && self.user.id && ($URL_ROOT + '/' + self.user.id + '/' + self.id)
  end
end

def keyword_from_title(title)
  if (link = title.find_child_by_name 'a')
    match = link['href'].match(/\A\/(.+?)\/(.+?)\Z/)
    dir = match[1]
    value = match[2]
    if dir == 'keyword'
      link[0].is_a?(String) ? CGI.unescapeHTML(link[0]) : ''
    else
      dir + ':' + value
    end
  else
    ''
  end
end

def extract_from_info(info, status)
  status.user = User.new
  info.each_child_elements {|child|
    case child['class']
    when 'username'
      status.user.id = child.find_child_by_name('a').children.join
    when 'reply'
      status.id = child.find_child_by_name('a')['id']
    when 'timestamp'
      status.created_at = Time.mktime(*child.find_child_by_name('a').children.join.split(/-| |:/))
    when 'source'
      status.source = child.find_child_by_name('a').children.join
    when 'replies'
      status.replies = child.children.map {|reply|
        if reply.is_a?(HTML::Element) && reply.name == 'a'
          match = reply['href'].match(/\A\/(.+?)\/(.+)\Z/)
          reply_status = Status.new
          reply_status.id = match[2]
          reply_status.user = User.new
          reply_status.user.id = match[1]
          reply_status
        else
          nil
        end
      }.compact
    end
  }
end

def make_status_text(tags)
  r = ''
  tags.each {|t|
    if t.is_a? String
      r << CGI.unescapeHTML(t.gsub(/[\r\n]/, ''))
    elsif t.name == 'br'
      r << "\r\n"
    elsif t.name == 'a'
      if t['href'] =~ /\A\/asin\/[0-9a-zA-Z]+\Z/
        r << t.to_s
      elsif t[0].is_a?(HTML::Element) && t[0].name == 'img'
        r << t[0]['src']
      elsif (match = t['href'].match(/\A\/keyword\/([^\/]+)/))
        r << '[[' << CGI.unescape(match[1]) << ']]'
      elsif (match = t['href'].match(/\A\/([a-zA-Z0-9\-_]+)\/?\Z/)) && t['class'] == 'user'
        r << 'id:' << match[1]
      elsif t[0].is_a?(String) && t['href'] != t[0] && t['href'] =~ /\Ahttps?\:\/\//
        r << '[' << t['href'] << ':title=' << t[0] << ']'
      else
        r << t['href']
      end
    elsif t.name == 'img'
      r << t['src']
    elsif t['class'] == 'video-body'
      r << t.find_child_by_name('object').find_child_element {|c|
        c.name == 'param' && c['name'] == 'movie'
      }['value']
    elsif t.name == 'div' && t['id'] =~ /\Anicovideo/
      next
    elsif t.name == 'script' && t['src'] && (match = t['src'].match(/\Ahttp\:\/\/www.nicovideo.jp\/thumb_watch\/(.+?)\?/))
      r << 'http://www.nicovideo.jp/watch/' << match[1]
    elsif t.name == 'script'
      next
    elsif t.name == 'span' && proc {
        object = t.child_element_at(0)
        object.is_a?(HTML::Element) && object.name == 'object' && object['id'] == 'mp3_3'
      }.call
      param = t.child_element_at(0).find_child_element {|c|
        c.name == 'param' && c['name'] == 'flashVars' && c['value'] =~ /\Amp3Url\=/
      }
      r << param['value']['mp3Url='.length .. -1] if param
    else
      r << t.to_s
    end
  }
  r
end

def tag_to_status(tag)
  return nil if !tag.is_a?(HTML::Element) || tag['class'] != 'entry'
  list_body = tag.find_child_by_class 'list-body'
  return nil unless list_body
  status = Status.new
  list_body.each_child_elements {|child|
    case child['class']
    when 'title'
      status.keyword = keyword_from_title child
    when 'body'
      first_index = 0
      first_element = child[first_index]
      if first_element.is_a?(HTML::Element) && first_element.name == 'a'
        first_in_link = first_element[0]
        if first_in_link.is_a?(HTML::Element) && first_in_link['class'] == 'icon-reply-link'
          if (match = first_element['href'].match(/\A\/(.+?)\/(.+)\Z/))
            status.in_reply_to_user_id = match[1]
            status.in_reply_to_status_id = match[2]
          end
          first_index += 1
        end
      end
      status.text = make_status_text(child.children[first_index .. -1])
    when 'info'
      extract_from_info(child, status)
    end
  }
  status
end

def tags_to_statuses(tags)
  tags.map {|tag| tag_to_status(tag)}.compact
end

def escape_json(s)
  s ? s.gsub('\\', '\\\\').gsub("\n", '\n').gsub("\r", '\r').gsub('"', '\"').gsub("\xE2\x80\xA8", " ") : ''
end

def to_json(o)
  case o
  when nil
    to_json('')
  when String
    '"' + escape_json(o) + '"'
  when Array
    '[' + o.map {|elem| to_json(elem)}.join(',') + ']'
  when Hash
    '{' + o.map {|elem| to_json(elem[0]) + ':' + to_json(elem[1])}.join(',') + '}'
  else
    o.to_s
  end
end

def user_json_map(user)
  user ? {
    'profile_image_url' => user.profile_image_url,
    'url' => user.url,
    'name' => user.name,
    'id' => user.id,
    'screen_name' => user.screen_name
  } : user
end

def status_json_map(s)
  {
    'link' => s.link,
    'keyword' => s.keyword,
    'source' => s.source,
    'replies' => s.replies && s.replies.map {|reply|
      {
        'user' => user_json_map(reply.user),
        'id' => reply.id
      }
    },
    'created_at' => s.utc_created_at,
    'text' => ((s.keyword =~ /\Aid\:[a-zA-Z0-9\-_]+\Z/) ? '' : s.keyword + '=') + s.text,
    'in_reply_to_user_id' => s.in_reply_to_user_id,
    'user' => user_json_map(s.user),
    'id' => s.id,
    'in_reply_to_status_id' => s.in_reply_to_status_id
  }
end

def statuses_to_json(statuses)
  to_json(statuses.map {|s| status_json_map(s)})
end

def print_header(header)
  header.each_pair {|name, value|
    puts name + ': ' + value.to_s
  }
  puts
end

header = {
  'Pramgma' => 'no-cache',
  'Cache-Control' => 'no-cache',
  'Content-Type' => 'text/javascript; charset=UTF-8',
  'Expires' => 'Sun, 25 Jan 2000 00:00:00 GMT'}

begin
  res = get_response($HOST_ROOT, make_path(cgi))
  raise 'http error' unless res.code == "200"
  tags = HTML::parse(res.body)
  callback = cgi.params['callback'][0]
  result = '';
  result << callback << '(' unless callback.nil?
  result << statuses_to_json(tags_to_statuses(tags))
  result << ');' unless callback.nil?
rescue
  $stderr.puts $!.message
  $stderr.puts $!.backtrace
  print_header header
  puts 'N A'
  exit
end

accept_gzip = /\s*(,\s*)?(x-)?gzip[\s;,]?/ =~ cgi.accept_encoding
if accept_gzip
  header['Content-Encoding'] = 'gzip'
  header['Vary'] = 'Accept-Encoding'
  require 'stringio'
  string_io = StringIO.new
  require 'zlib'
  Zlib::GzipWriter.wrap(string_io, Zlib::BEST_COMPRESSION) {|gz|
    gz.write result
    gz.finish
  }
  body = string_io.string
else
  body = result
end
header['Content-Length'] = body.size
print_header header
$stdout.binmode if accept_gzip
print body
